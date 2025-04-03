import * as DAPI from 'discord-api-types/v10'

import { bot } from '@/bot'
import { botHeaders } from './api/api-utils'
import * as config from '@/config'

export function deferMessage(options?: { ephemeral?: boolean }): DAPI.APIInteractionResponse {
	return {
		type: DAPI.InteractionResponseType.DeferredChannelMessageWithSource,
		data: {
			flags: options?.ephemeral ? DAPI.MessageFlags.Ephemeral : undefined,
		},
	}
}

export function deferMessageUpdate(): DAPI.APIInteractionResponse {
	return {
		type: DAPI.InteractionResponseType.DeferredMessageUpdate,
	}
}

export async function getOriginalInteractionResponse(interactionToken: string) {
	const applicationId = bot.env.DISCORD_APPLICATION_ID
	const discordToken = bot.env.DISCORD_TOKEN

	const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`

	const response = await fetch(url, {
		headers: botHeaders(discordToken, null),
		method: 'GET',
	})

	if (!response.ok) {
		throw {
			statusCode: response.status,
			body: await response.json(),
		}
	}

	return await response.json()
}

export async function createInteractionResponse(
	interactionToken: string,
	webhookBody: DAPI.RESTPostAPIWebhookWithTokenJSONBody,
) {
	const applicationId = bot.env.DISCORD_APPLICATION_ID
	const discordToken = bot.env.DISCORD_TOKEN

	const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`

	const response = await fetch(url, {
		headers: botHeaders(discordToken),
		method: 'POST',
		body: JSON.stringify(webhookBody),
	})

	if (!response.ok) {
		throw {
			statusCode: response.status,
			body: await response.json(),
		}
	}

	if (response.status === 204) {
		return null
	}

	const result = (await response.json()) as DAPI.APIMessage

	return result
}

export async function editInteractionResponse(
	interactionToken: string,
	webhookBody: DAPI.RESTPatchAPIWebhookWithTokenMessageJSONBody,
) {
	const applicationId = bot.env.DISCORD_APPLICATION_ID
	const discordToken = bot.env.DISCORD_TOKEN

	const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`
	const jsonPaylod = JSON.stringify(webhookBody)

	const response = await fetch(url, {
		headers: botHeaders(discordToken),
		method: 'PATCH',
		body: jsonPaylod,
	})

	if (!response.ok) {
		let json = ''

		try {
			json = JSON.stringify(await response.json())
		} catch {
			json = 'No JSON in the response'
		}

		console.error(`HTTP ERROR ${response.status}: ${json}`)
	}

	return response
}

export async function editInteractionResponseError(
	interactionToken: string,
	error: string,
	author?: DAPI.APIEmbedAuthor,
) {
	try {
		await editInteractionResponse(interactionToken, {
			embeds: [
				{
					color: config.ERROR_COLOUR,
					author: author,
					description: error,
				},
			],
		})
	} catch {
		console.error("Couldn't edit interaction response.")
	}
}

export async function deleteInteractionResponse(interactionToken: string) {
	const applicationId = bot.env.DISCORD_APPLICATION_ID
	const discordToken = bot.env.DISCORD_TOKEN

	const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`

	const response = await fetch(url, {
		headers: botHeaders(discordToken, null),
		method: 'DELETE',
	})

	if (!response.ok) {
		throw {
			statusCode: response.status,
			body: await response.json(),
		}
	}

	return null
}
