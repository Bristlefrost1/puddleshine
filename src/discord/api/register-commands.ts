import * as DAPI from 'discord-api-types/v10'

import { botHeaders } from './api-utils'
import { type PuddleshineBot } from '@/bot'

type RegisterCommandsSuccess = {
	success: true,
	message: string,
}

type RegisterCommandsError = {
	success: false,
	message: string,

	apiResponse: {
		httpStatus: number,
		body: any,
	},
}

type RegisterCommandsResponse = RegisterCommandsSuccess | RegisterCommandsError

export async function registerApplicationCommands(
	commands: DAPI.RESTPostAPIApplicationCommandsJSONBody[],
	bot: PuddleshineBot,
): Promise<RegisterCommandsResponse> {
	const applicationId = bot.env.DISCORD_APPLICATION_ID
	const token = bot.env.DISCORD_TOKEN

	const apiUrl = `https://discord.com/api/v10/applications/${applicationId}/commands`
	
	const response = await fetch(apiUrl, {
		headers: botHeaders(token),
		method: 'PUT',
		body: JSON.stringify(commands),
	})
	
	if (!response.ok) {
		const responseStatus = response.status
		const responseBodyJson = JSON.parse(await response.text())

		return {
			success: false,
			message: 'Failed to register the global application commands.',
			
			apiResponse: {
				httpStatus: responseStatus,
				body: responseBodyJson,
			},
		}
	}

	return { success: true, message: 'Successfully registered the global application commands.' }
}

export async function registerGuildCommands(
	guildId: string,
	commands: DAPI.RESTPostAPIApplicationCommandsJSONBody[],
	bot: PuddleshineBot,
): Promise<RegisterCommandsResponse> {
	const applicationId = bot.env.DISCORD_APPLICATION_ID
	const token = bot.env.DISCORD_TOKEN

	const apiUrl = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`

	const response = await fetch(apiUrl, {
		headers: botHeaders(token),
		method: 'PUT',
		body: JSON.stringify(commands),
	})

	if (!response.ok) {
		const responseStatus = response.status
		const responseBodyJson = JSON.parse(await response.text())

		return {
			success: false,
			message: `Failed to register the guild application commands for guild ID ${guildId}.`,
			
			apiResponse: {
				httpStatus: responseStatus,
				body: responseBodyJson,
			},
		}
	}

	return { success: true, message: `Successfully registered the guild application commands for guild ID ${guildId}.` }
}
