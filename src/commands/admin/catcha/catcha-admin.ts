import * as DAPI from 'discord-api-types/v10'

import { embedMessageResponse, simpleEphemeralResponse } from '@/discord/responses'
import { discordGetUser } from '@/discord/api/discord-user'
import { bot } from '@/bot'
import * as catchaDB from '@/db/catcha-db'
import { AdminAccessLevel } from '../admin'

import * as config from '@/config'

async function getCatcha(options: DAPI.APIApplicationCommandInteractionDataBasicOption[]): Promise<DAPI.APIInteractionResponse> {
	let userId: string | undefined

	if (options[0] && options[0].type === DAPI.ApplicationCommandOptionType.User) {
		userId = options[0].value
	}

	if (!userId) return simpleEphemeralResponse('No user option provided.')

	const catchaData = await catchaDB.findCatcha(bot.prisma, userId)

	if (catchaData) {
		const stringifiedJson = JSON.stringify(catchaData, undefined, 4)
		const discordUser = await discordGetUser({ token: bot.env.DISCORD_TOKEN, id: userId })

		const discordUserDetailsString = `Discord user ID: ${userId}\nDiscord username: \`${discordUser?.username}#${discordUser?.discriminator}\`\n`

		return embedMessageResponse({
			title: 'Database query results',
			description: discordUserDetailsString + '```json\n' + stringifiedJson + '\n```',
		})
	} else {
		return embedMessageResponse({
			color: config.ERROR_COLOUR,
			description: 'No Catcha found in the database.',
		})
	}
}

export async function handleCatchaAdminCommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	user: DAPI.APIUser,
	accessLevel: AdminAccessLevel,
	subcommand: DAPI.APIApplicationCommandInteractionDataSubcommandOption,
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined,
): Promise<DAPI.APIInteractionResponse> {
	switch (subcommand.name) {
		case 'get':
			return await getCatcha(options!)
		default:
		// Do nothing
	}

	return simpleEphemeralResponse('No command found.')
}
