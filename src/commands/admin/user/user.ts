import * as DAPI from 'discord-api-types/v10'

import { embedMessageResponse, simpleEphemeralResponse } from '@/discord/responses'
import { discordGetUser } from '@/discord/api/discord-user'
import { bot } from '@/bot'
import * as db from '@/db/database'
import { AdminAccessLevel } from '../admin'

import * as config from '@/config'

async function getUser(options: DAPI.APIApplicationCommandInteractionDataBasicOption[]): Promise<DAPI.APIInteractionResponse> {
	let userId: string | undefined

	if (options[0] && options[0].type === DAPI.ApplicationCommandOptionType.User) {
		userId = options[0].value
	}

	if (!userId) return simpleEphemeralResponse('No user option provided.')

	const userData = await db.getUserWithDiscordId(bot.prisma, userId)

	if (userData) {
		const discordUser = await discordGetUser({id: userId, token: bot.env.DISCORD_TOKEN })
		const discordUserDetailsString = `Discord user ID: ${userId}\nDiscord username: \`${discordUser?.username}\`\n`

		const userUuid = userData.uuid
		const createdAtUnixTimestamp = Math.floor(userData.createdAt.getTime() / 1000)

		return embedMessageResponse({
			title: 'User details',
			description: discordUserDetailsString,
			fields: [{ name: 'Details', value: `User UUID: ${userUuid}\nCreated at: <t:${createdAtUnixTimestamp}:F>` }],
		})
	} else {
		return embedMessageResponse({
			color: config.ERROR_COLOUR,
			description: 'No user found in the database.',
		})
	}
}

export async function handleUserAdminCommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	user: DAPI.APIUser,
	accessLevel: AdminAccessLevel,
	subcommand: DAPI.APIApplicationCommandInteractionDataSubcommandOption,
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined,
): Promise<DAPI.APIInteractionResponse> {
	switch (subcommand.name) {
		case 'get':
			return await getUser(options!)
		default:
		// Do nothing
	}

	return simpleEphemeralResponse('No command found.')
}
