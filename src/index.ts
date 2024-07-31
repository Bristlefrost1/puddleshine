/**
 * index.ts
 *
 * This is the main entrypoint of the Cloudflare Worker
 */

import * as DAPI from 'discord-api-types/v10';
import { verifyKey } from 'discord-interactions';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

import { JsonResponse, InteractionResponse } from '#utils/responses.js';
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
		switch (controller.cron) {
			case config.CATCHA_NEW_EVENT_CRON:
				await randomizeNewEvent(env);
				break;
			default:
				console.warn(`[WARN] Ignoring unrecognized cron trigger ${controller.cron}`);
				break;
		}
	},
};
