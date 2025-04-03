import * as DAPI from 'discord-api-types/v10'

import * as config from '@/config'

export function messageResponse(options: {
	content?: string
	embeds?: DAPI.APIEmbed[]
	components?: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[]

	ephemeral?: boolean
	allowedMentions?: DAPI.APIAllowedMentions

	update?: boolean
}): DAPI.APIInteractionResponseChannelMessageWithSource | DAPI.APIInteractionResponseUpdateMessage {
	if (options.update) {
		return {
			type: DAPI.InteractionResponseType.UpdateMessage,
			data: {
				content: options.content,
				embeds: options.embeds,
				components: options.components,
				allowed_mentions: options.allowedMentions,
			},
		}
	} else {
		return {
			type: DAPI.InteractionResponseType.ChannelMessageWithSource,
			data: {
				flags: options.ephemeral ? DAPI.MessageFlags.Ephemeral : undefined,
				content: options.content,
				embeds: options.embeds,
				components: options.components,
				allowed_mentions: options.allowedMentions,
			},
		}
	}
}

export function confirmationResponse(options: {
	action: string
	actionData?: string

	question: string

	allowedMentions?: DAPI.APIAllowedMentions
	ephemeral?: boolean
}): DAPI.APIInteractionResponse {
	return {
		type: DAPI.InteractionResponseType.ChannelMessageWithSource,
		data: {
			flags: options.ephemeral ? DAPI.MessageFlags.Ephemeral : undefined,
			embeds: [
				{
					title: 'Confirmation',
					description: options.question,
				},
			],
			components: [
				{
					type: DAPI.ComponentType.ActionRow,
					components: [
						{
							type: DAPI.ComponentType.Button,
							custom_id: `${options.action}/y${options.actionData ? '/' + options.actionData : ''}`,
							style: DAPI.ButtonStyle.Success,
							label: '✅ Confirm',
						},
						{
							type: DAPI.ComponentType.Button,
							custom_id: `${options.action}/n${options.actionData ? '/' + options.actionData : ''}`,
							style: DAPI.ButtonStyle.Danger,
							label: '❌ Cancel',
						},
					],
				},
			],
			allowed_mentions: options.allowedMentions,
		},
	}
}

export function cancelConfirmationResponse(
	reason?: string,
	additionalOptions?: { oldEmbed?: DAPI.APIEmbed },
): DAPI.APIInteractionResponse {
	return {
		type: DAPI.InteractionResponseType.UpdateMessage,
		data: {
			content: `Confirmation canceled${reason ? ': ' + reason : '.'}`,
			embeds: additionalOptions && additionalOptions.oldEmbed ? [additionalOptions.oldEmbed] : undefined,
			components: [],
		},
	}
}

/**
 * Constructs a simple message API interaction response.
 *
 * @param message The message text.
 * @returns A message interaction response that is the given `message`.
 */
export function simpleMessageResponse(
	message: string,
	allowedMentions?: DAPI.APIAllowedMentions,
): DAPI.APIInteractionResponse {
	return {
		type: DAPI.InteractionResponseType.ChannelMessageWithSource,
		data: {
			content: message,
			allowed_mentions: allowedMentions,
		},
	}
}

/**
 * Constructs a simple ephemeral message API interaction response.
 *
 * @param message The message text.
 * @returns An ephemeral message interaction response that is the given `message`.
 */
export function simpleEphemeralResponse(message: string): DAPI.APIInteractionResponse {
	return {
		type: DAPI.InteractionResponseType.ChannelMessageWithSource,
		data: {
			flags: DAPI.MessageFlags.Ephemeral,
			content: message,
		},
	}
}

/**
 * Constructs an embed with the error colour and specified message.
 *
 * @param message The error message.
 * @returns An error embed.
 */
export function errorEmbed(message: string, title?: string, author?: DAPI.APIEmbedAuthor): DAPI.APIEmbed {
	return {
		title: title,
		author: author,
		color: config.ERROR_COLOUR,

		description: message,
	}
}

export function embedMessageResponse(
	embed: DAPI.APIEmbed,
	ephemeral?: boolean,
	components?: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[],
): DAPI.APIInteractionResponse {
	return {
		type: DAPI.InteractionResponseType.ChannelMessageWithSource,
		data: {
			flags: ephemeral ? DAPI.MessageFlags.Ephemeral : undefined,
			embeds: [embed],
			components,
		},
	}
}
