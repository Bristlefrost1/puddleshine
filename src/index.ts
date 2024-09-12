/**
 * index.ts
 *
 * This is the main entrypoint of the Cloudflare Worker
 */

import * as DAPI from 'discord-api-types/v10';
import { verifyKey } from 'discord-interactions';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

import { JsonResponse, InteractionResponse, FormDataResponse } from '#utils/responses.js';
import { onInteractionReceived } from '#interactions.js';

import { randomizeNewEvent } from '#commands/catcha/event/event.js';

import * as config from '#config.js';

/**
 * Verifies if an HTTP request is coming from Discord based on its signature.
 *
 * @param request The incoming HTTP request.
 * @param env The Cloudflare worker env.
 * @returns `isValid` will be true/false. If the request is valid, `interaction` will be the interaction object.
 */
async function verifyDiscordRequest(
	request: Request,
	env: Env,
): Promise<{ isValid: boolean; interaction?: DAPI.APIInteraction }> {
	const signature = request.headers.get('x-signature-ed25519');
	const timestamp = request.headers.get('x-signature-timestamp');
	const body = await request.text();

	const isValidRequest = signature && timestamp && verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);

	if (!isValidRequest) {
		return { isValid: false };
	}

	return { interaction: JSON.parse(body), isValid: true };
}

/**
 * Handles incoming `POST` requests.
 *
 * @param request The HTTP request.
 * @param env The Worker's env.
 * @param ctx The Worker's execution context.
 * @returns An HTTP response.
 */
async function handlePOST(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	// Verify if the request is actually coming from Discord
	// If not, return a 401 error
	const { isValid, interaction } = await verifyDiscordRequest(request, env);
	if (!isValid || !interaction) {
		return new JsonResponse({ error: 'BadSignature' }, { status: 401 });
	}

	// Initialize Prisma ORM
	const adapter = new PrismaD1(env.DB);
	const prisma = new PrismaClient({ adapter });

	// Make it available globally in the env
	env.PRISMA = prisma;

	// Call the interaction handler
	const response = await onInteractionReceived(interaction, env, ctx);

	// If the message is too long to post to Discord, post it as an attachment instead
	if (response.type === DAPI.InteractionResponseType.ChannelMessageWithSource) {
		if (response.data.content && response.data.content.length > 2000) {
			ctx.waitUntil(
				(async () => {
					const webhookUrl = `https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`;
					const messageContent = response.data.content ?? '';
					const messageTxtFile = new File([messageContent], 'message.txt', { type: 'text/plain' });

					response.data.content = 'Message too long for Discord.';

					if (!response.data.attachments) response.data.attachments = [];
					response.data.attachments.push({
						id: 0,
						description: 'Message that was too long for Discord',
						filename: 'message.txt',
					});

					const formDataResponse = new FormDataResponse(response.data, [messageTxtFile]);
					const responseBody = await formDataResponse.text();
					const webhookResponse = await fetch(webhookUrl, {
						headers: {
							'Content-Type': formDataResponse.headers.get('Content-Type') ?? 'multipart/form-data',
							Authorization: `Bot ${env.DISCORD_TOKEN}`,
						},
						method: 'PATCH',
						body: responseBody,
					});

					if (!webhookResponse.ok) {
						let json = '';

						try {
							json = JSON.stringify(await webhookResponse.json());
						} catch {
							json = 'No JSON in the response';
						}

						console.error(`HTTP ERROR ${webhookResponse.status}: ${json}`);
					}
				})(),
			);

			return new InteractionResponse({
				type: DAPI.InteractionResponseType.DeferredChannelMessageWithSource,
			});
		}
	}

	// Return whatever it returned as an HTTP response
	return new InteractionResponse(response);
}

export default {
	/**
	 * The entry point of the Worker.
	 *
	 * @param request The incoming HTTP request.
	 * @param env The Worker's env.
	 * @param ctx The Worker's execution context.
	 * @returns An HTTP response.
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'GET') {
			return new Response('Hello World!');
		} else if (request.method === 'POST') {
			return handlePOST(request, env, ctx);
		} else {
			return new JsonResponse({ error: 'UnsupportedMethod' }, { status: 405 });
		}
	},

	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		// Initialize Prisma ORM
		const adapter = new PrismaD1(env.DB);
		const prisma = new PrismaClient({ adapter });

		// Make it available globally in the env
		env.PRISMA = prisma;

		switch (controller.cron) {
			case config.DAILY_CRON:
				// Purge the caches daily
				await env.PRISMA.catcha.updateMany({
					where: {
						NOT: {
							rollCache: null,
						},
					},
					data: {
						rollCache: null,
					},
				});
				break;

			case config.WEEKLY_CRON:
				await randomizeNewEvent(env);
				break;

			default:
				console.warn(`[WARN] Ignoring unrecognized cron trigger ${controller.cron}`);
				break;
		}
	},
};
