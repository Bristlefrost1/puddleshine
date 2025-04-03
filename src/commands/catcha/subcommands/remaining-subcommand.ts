import * as DAPI from 'discord-api-types/v10'

import * as listMessage from '@/discord/list-message'
import { discordGetUser } from '@/discord/api/discord-user'
import { messageResponse, simpleEphemeralResponse, embedMessageResponse, errorEmbed } from '@/discord/responses'
import * as archive from '@/commands/catcha/archive'
import * as collection from '@/commands/catcha/collection'
import * as listUtils from '@/commands/catcha/collection/list'
import { createStarString } from '@/utils/star-string'
import { bot } from '@/bot'
import { commonSearchOptions } from '@/commands/catcha/utils/common-search-options'
import { type Subcommand } from '@/commands'

import * as config from '@/config'

async function getTitle(requestedBy: DAPI.APIUser, userId: string) {
	let title = ''

	if (userId === requestedBy.id) {
		const discriminator = requestedBy.discriminator === '0' ? '' : `#${requestedBy.discriminator}`
		title = `${requestedBy.username}${discriminator}'s remaining cards`
	} else {
		const discordUserFromId = await discordGetUser({ id: userId, token: bot.env.DISCORD_TOKEN })

		if (discordUserFromId) {
			const discriminator = discordUserFromId.discriminator === '0' ? '' : `#${discordUserFromId.discriminator}`
			title = `${discordUserFromId.username}${discriminator}'s remaining cards`
		} else {
			title = `${userId}'s remaining cards`
		}
	}

	return title
}

function createCongratulationsMessage(
	user: DAPI.APIUser,
	userId?: string,
	onlyRarity?: number,
	onlyInverted?: boolean,
) {
	let userHas = ''
	let inverted = ''

	if (user.id === userId) {
		userHas = '🎉 Congratulations! You have'
	} else {
		userHas = 'This user has'
	}

	if (onlyInverted) {
		inverted = 'inverted '
	}

	if (onlyRarity !== undefined) {
		return `${userHas} all of the ${inverted}cards of this rarity.`
	} else {
		return `${userHas} all of the ${inverted}cards.`
	}
}

async function listRemaining(options: {
	userId: string;

	onlyRarity?: number;
	onlyInverted?: boolean;

	guildId?: string;
}): Promise<string[]> {
	const onlyInverted = options.onlyInverted ?? false

	const remainingCardIds = await collection.getRemainingCardIds(options.userId, {
		onlyRarity: options.onlyRarity,
		onlyInverted: options.onlyInverted,
		guildId: options.guildId,
	})
	const remainingList: string[] = []

	for (const cardId of remainingCardIds) {
		const card = (await archive.getCardDetailsById(cardId))!

		remainingList.push(
			`[#${cardId}] ${archive.getCardFullName({ card, inverted: onlyInverted })} ${createStarString(card.rarity, onlyInverted)}`,
		)
	}

	return remainingList
}

export default {
	name: 'remaining',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'remaining',
		description: "List your or another user's remaining cards.",

		options: [...commonSearchOptions],
	},

	async onApplicationCommand({ interaction, user, options }) {
		// Set the defaults
		let listUserId = user.id
		let pageNumber = 1
		let onlyRarity: number | undefined
		let onlyInverted: boolean | undefined

		// Parse the options
		if (options) {
			const searchOptions = listUtils.parseSearchOptions(options)

			listUserId = searchOptions.userId ?? listUserId
			pageNumber = searchOptions.page ?? pageNumber
			onlyRarity = searchOptions.onlyRarity
			onlyInverted = searchOptions.onlyInverted
		}

		if (pageNumber < 1) return simpleEphemeralResponse('The page number cannot be less than 1.')

		const remainingList = await listRemaining({
			userId: listUserId,
			onlyRarity: onlyRarity,
			onlyInverted: onlyInverted,
			guildId: interaction.guild_id,
		})

		if (remainingList.length === 0) {
			return messageResponse({
				embeds: [
					{
						color: config.INVERTED_COLOUR,
						description: createCongratulationsMessage(user, listUserId, onlyRarity, onlyInverted),
					},
				],
			})
		}

		const list = listMessage.createListMessage({
			action: 'catcha/remaining',
			listDataString: listUtils.buildListDataString({ userId: listUserId, onlyRarity, onlyInverted }),

			items: remainingList,
			pageNumber,

			title: await getTitle(user, listUserId),
			author: listUtils.getRequestedByAuthor(user, listUserId),
		})

		return messageResponse({
			embeds: [list.embed],
			components: list.scrollActionRow !== undefined ? [list.scrollActionRow] : undefined,
		})
	},

	async onMessageComponent({ interaction, user, parsedCustomId }) {
		const pageData = parsedCustomId[2]
		const listDataString = parsedCustomId[3]
		const listData = listUtils.parseListDataString(listDataString)

		const remainingList = await listRemaining({
			userId: listData.userId,
			onlyRarity: listData.onlyRarity,
			onlyInverted: listData.onlyInverted,
			guildId: interaction.guild_id,
		})

		if (remainingList.length === 0) {
			return messageResponse({
				embeds: [
					{
						color: config.INVERTED_COLOUR,
						description: createCongratulationsMessage(
							user,
							listData.userId,
							listData.onlyRarity,
							listData.onlyInverted,
						),
					},
				],
				update: true,
			})
		}

		const newList = listMessage.scrollListMessage({
			action: 'catcha/remaining',
			pageData,
			listDataString,

			items: remainingList,

			title: interaction.message.embeds[0]?.title,
			author: listUtils.getRequestedByAuthor(user, listData.userId),
		})

		return messageResponse({
			embeds: [newList.embed],
			components: newList.scrollActionRow !== undefined ? [newList.scrollActionRow] : undefined,
			update: true,
		})
	},
} as Subcommand
