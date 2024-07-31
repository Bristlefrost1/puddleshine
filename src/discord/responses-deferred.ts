import * as DAPI from 'discord-api-types/v10';

import { wait } from '#utils/wait.js';
import * as config from '#config.js';

function deferMessage(options?: { ephemeral?: boolean }): DAPI.APIInteractionResponse {
	return {
		type: DAPI.InteractionResponseType.DeferredChannelMessageWithSource,
		data: {
			flags: options?.ephemeral ? DAPI.MessageFlags.Ephemeral : undefined,
		},
	};
}

function deferMessageUpdate(): DAPI.APIInteractionResponse {
	return {
		type: DAPI.InteractionResponseType.DeferredMessageUpdate,
	};
}

async function getOriginalInteractionResponse(applicationId: string, discordToken: string, interactionToken: string) {
	const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;

	const response = await fetch(url, {
		headers: {
			Accept: 'application/json',
			Authorization: `Bot ${discordToken}`,
		},
		method: 'GET',
	});

	if (!response.ok) {
		throw {
			statusCode: response.status,
			body: await response.json(),
		};
	}

	return await response.json();
}

async function createInteractionResponse(
	applicationId: string,
	discordToken: string,
	interactionToken: string,
	webhookBody: DAPI.RESTPostAPIWebhookWithTokenJSONBody,
) {
	const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`;

	const response = await fetch(url, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${discordToken}`,
		},
		method: 'POST',
		body: JSON.stringify(webhookBody),
	});

	if (!response.ok) {
		throw {
			statusCode: response.status,
			body: await response.json(),
		};
	}

	if (response.status === 204) {
		return null;
	}

	const result = (await response.json()) as DAPI.APIMessage;

	return result;
}

async function editInteractionResponse(
	applicationId: string,
	discordToken: string,
	interactionToken: string,
	webhookBody: DAPI.RESTPatchAPIWebhookWithTokenMessageJSONBody,
) {
	const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
	const jsonPaylod = JSON.stringify(webhookBody);

	const response = await fetch(url, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${discordToken}`,
		},
		method: 'PATCH',
		body: jsonPaylod,
	});

	return response;

	/*
	for (let attempt = 1; attempt <= 3; attempt++) {
		if (response.ok) {
			break;
		} else {
			if (attempt === 3) {
				throw {
					statusCode: response.status,
					statusText: response.statusText,
					headers: response.headers,
				};
			} else {	
				await wait(1500);
				continue;
			}
		}
	}
	*/
}

async function deleteInteractionResponse(applicationId: string, discordToken: string, interactionToken: string) {
	const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;

	const response = await fetch(url, {
		headers: {
			Accept: 'application/json',
			Authorization: `Bot ${discordToken}`,
		},
		method: 'DELETE',
	});

	if (!response.ok) {
		throw {
			statusCode: response.status,
			body: await response.json(),
		};
	}

	return null;
}

async function editInteractionResponseError(
	applicationId: string,
	discordToken: string,
	interactionToken: string,
	error: string,
	author?: DAPI.APIEmbedAuthor,
) {
	try {
		await editInteractionResponse(applicationId, discordToken, interactionToken, {
			embeds: [
				{
					color: config.ERROR_COLOR,
					author: author,
					description: error,
				},
			],
		});
	} catch {
		console.error("Couldn't edit interaction response.");
	}
}

export {
	deferMessage,
	deferMessageUpdate,
	getOriginalInteractionResponse,
	createInteractionResponse,
	editInteractionResponse,
	deleteInteractionResponse,
	editInteractionResponseError,
};
