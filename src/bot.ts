/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import * as DAPI from 'discord-api-types/v10'
import nacl from 'tweetnacl'
import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { type DefaultArgs } from '@prisma/client/runtime/library'

import { onInteractionReceived } from './interactions'
import { registerApplicationCommands, registerGuildCommands } from './discord/api/register-commands'
import { commandsRegistry } from './commands'
import { randomiseNewEvent } from './commands/catcha/event'

import * as config from './config'

const jsonResponse = (value: any, statusCode?: number) => new Response(JSON.stringify(value), {
	status: statusCode ?? 200,
	headers: {
		'Content-Type': 'application/json;charset=UTF-8',
	},
})

export let bot: PuddleshineBot

export class PuddleshineBot {
	public readonly request: Request<unknown, IncomingRequestCfProperties<unknown>> | undefined
	public readonly controller: ScheduledController | undefined

	public readonly env: Env
	public readonly ctx: ExecutionContext

	public readonly prisma: PrismaClient<{ adapter: PrismaD1 }, never, DefaultArgs>

	constructor(options: {
		request?: Request<unknown, IncomingRequestCfProperties<unknown>>
		controller?: ScheduledController

		env: Env
		ctx: ExecutionContext
	}) {
		if (options.request) this.request = options.request
		if (options.controller) this.controller = options.controller

		this.env = options.env
		this.ctx = options.ctx

		// Initialise Prisma ORM
		const adapter = new PrismaD1(this.env.DB)
		this.prisma = new PrismaClient({ adapter })
	}

	private async verifyDiscordRequest(): Promise<{ isValid: boolean, interaction?: DAPI.APIInteraction }> {
		if (this.request === undefined) throw 'No request to verify'

		const signature = this.request.headers.get('x-signature-ed25519')
		const timestamp = this.request.headers.get('x-signature-timestamp')
		let body: string

		try {
			body = await this.request.text()
		} catch {
			return { isValid: false }
		}

		if (signature === null || timestamp === null || body === undefined) {
			return { isValid: false }
		}

		try {
			const isVerified = nacl.sign.detached.verify(
				Buffer.from(timestamp + body),
				Buffer.from(signature, 'hex'),
				Buffer.from(this.env.DISCORD_PUBLIC_KEY, 'hex'),
			)
		
			if (!isVerified) {
				return { isValid: false }
			}
		
			return { interaction: JSON.parse(body), isValid: true }
		} catch (error) {
			return { isValid: false }
		}
	}

	async syncCommands(): Promise<Response> {
		if (this.request === undefined) throw 'This must be invoked through an HTTP request'

		const unauthorisedError = jsonResponse({ error: 'Unauthorised' }, 401)

		const url = new URL(this.request.url)
		const syncKey = url.searchParams.get('syncKey')

		if (syncKey === undefined) return unauthorisedError
		if (syncKey !== this.env.SYNC_COMMANDS_KEY) return unauthorisedError

		try {
			const commands = Object.values(commandsRegistry)
			const globalApplicationCommands: DAPI.RESTPostAPIApplicationCommandsJSONBody[] = []
			const guildCommands = new Map<string, DAPI.RESTPostAPIApplicationCommandsJSONBody[]>() // Guild id, commands
	
			commands.forEach((command) => {
				if (command.onlyGuilds !== undefined && command.onlyGuilds.length > 0) {
					for (const guildId of command.onlyGuilds) {
						const oldGuildCommands = guildCommands.get(guildId)
		
						if (oldGuildCommands) {
							oldGuildCommands.push(command.commandData)
							guildCommands.set(guildId, oldGuildCommands)
						} else {
							guildCommands.set(guildId, [command.commandData])
						}
					}
				} else {
					globalApplicationCommands.push(command.commandData)
				}
			})
	
			const globalApplicationCommandsResponse = await registerApplicationCommands(globalApplicationCommands, this)
			const guildApplicationCommandsResponses: typeof globalApplicationCommandsResponse[] = []
	
			if (guildCommands.size > 0) {
				for (const [guildId, commandsToRegister] of guildCommands) {
					guildApplicationCommandsResponses.push(await registerGuildCommands(guildId, commandsToRegister, this))
				}
			}
	
			return jsonResponse({
				globalApplicationCommands: globalApplicationCommandsResponse,
				guilds: guildApplicationCommandsResponses,
			})
		} catch (error) {
			return jsonResponse({
				unexpectedError: error,
			}, 500)
		}
	}

	async webhook(): Promise<Response> {
		const unauthorisedError = jsonResponse({ error: 'Unauthorised' }, 401)
		// Verify if the request is actually coming from Discord
		// If not, return a 401 error
		const { isValid, interaction } = await this.verifyDiscordRequest()
		if (!isValid || !interaction) return unauthorisedError

		// Call the interaction handler
		const response = await onInteractionReceived(interaction, this)

		// Return whatever it returned as a JSON response
		return jsonResponse(response)
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url)

		if (url.pathname === '/api/webhook') {
			bot = new PuddleshineBot({ request, env, ctx })
			return await bot.webhook()
		} else if (url.pathname === '/api/sync-commands') {
			bot = new PuddleshineBot({ request, env, ctx })
			return await bot.syncCommands()
		} else {
			return new Response('Nothing here')
		}
	},

	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		bot = new PuddleshineBot({ controller, env, ctx })

		switch (controller.cron) {
			case config.DAILY_CRON:
				// Purge the caches daily
				await bot.prisma.catcha.updateMany({
					where: {
						NOT: {
							rollCache: null,
						},
					},
					data: {
						rollCache: null,
					},
				})
				break

			case config.WEEKLY_CRON:
				await randomiseNewEvent()
				break

			default:
				console.warn(`[WARN] Ignoring unrecognised cron trigger ${controller.cron}`)
				break
		}
	},
} satisfies ExportedHandler<Env>
