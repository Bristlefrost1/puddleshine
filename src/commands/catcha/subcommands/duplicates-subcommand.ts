import * as DAPI from 'discord-api-types/v10'

import * as discordUserApi from '@/discord/api/discord-user'
import * as listMessage from '@/discord/list-message'
import { messageResponse, simpleEphemeralResponse, embedMessageResponse, errorEmbed } from '@/discord/responses'
import * as collection from '@/commands/catcha/collection'
import type { Card } from '@/commands/catcha/collection'
import * as archive from '@/commands/catcha/archive'
import { createStarString } from '@/utils/star-string'
import * as listUtils from '@/commands/catcha/collection/list'
import * as enums from '@/commands/catcha/catcha-enums'
import { bot } from '@/bot'
import { commonSearchOptions } from '@/commands/catcha/utils/common-search-options'
import { type Subcommand } from '@/commands'

async function getTitle(requestedBy: DAPI.APIUser, userId: string) {
	let title = ''

	if (userId === requestedBy.id) {
		const discriminator = requestedBy.discriminator === '0' ? '' : `#${requestedBy.discriminator}`
		title = `${requestedBy.username}${discriminator}'s duplicates`
	} else {
		const discordUserFromId = await discordUserApi.discordGetUser({ id: userId, token: bot.env.DISCORD_TOKEN })

		if (discordUserFromId) {
			const discriminator = discordUserFromId.discriminator === '0' ? '' : `#${discordUserFromId.discriminator}`
			title = `${discordUserFromId.username}${discriminator}'s duplicates`
		} else {
			title = `${userId}'s duplicates`
		}
	}

	return title
}

async function listDuplicates(options: {
	userId: string

	onlyRarity?: number
	onlyInverted?: boolean
	onlyVariant?: boolean
}): Promise<string[]> {
	const cardCounts = await collection.getCardCounts(options.userId, {
		rarity: options.onlyRarity,
		onlyInverted: options.onlyInverted,
		onlyVariant: options.onlyVariant,
	})

	if (cardCounts.size === 0) return []

	const duplicates: { cardId: number; isInverted: boolean; variant?: string; count: number }[] = []

	for (const [key, value] of cardCounts) {
		if (value > 1) {
			const cardKeyDetails = collection.parseCardKey(key)
			const cardDetails = await archive.getCardDetailsById(cardKeyDetails.cardId)

			if (cardDetails !== undefined) {
				duplicates.push({
					cardId: cardKeyDetails.cardId,
					isInverted: cardKeyDetails.inverted,
					variant: cardKeyDetails.variant,
					count: value,
				})
			}
		}
	}

	if (duplicates.length === 0) return []

	const sortedDuplicates = duplicates.toSorted((a, b) => {
		if (b.count > a.count) {
			return 1;
		} else if (a.count > b.count) {
			return -1;
		} else {
			if (a.cardId === b.cardId) {
				return 0;
			} else {
				const cardA = archive.getCachedCardDetailsById(a.cardId)!
				const cardB = archive.getCachedCardDetailsById(b.cardId)!

				const aFullName = archive.getCardFullName({ card: cardA })
				const bFullName = archive.getCardFullName({ card: cardB })

				return aFullName.localeCompare(bFullName, 'en')
			}
		}
	})

	const duplicatesList: string[] = []

	sortedDuplicates.forEach((card) => {
		const cardId = card.cardId
		const isInverted = card.isInverted
		const cardDetails = archive.getCachedCardDetailsById(cardId)!
		const rarity = cardDetails.rarity

		duplicatesList.push(
			`[#${cardId}] x${card.count}  ${archive.getCardFullName({ card: cardDetails, inverted: isInverted, variant: card.variant})} ${createStarString(rarity, isInverted)}`,
		)
	})

	return duplicatesList
}

export default {
	name: 'duplicates',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'duplicates',
		description: "List your or another user's duplicate cards.",

		options: [
			...commonSearchOptions,
			{
				type: DAPI.ApplicationCommandOptionType.Boolean,
				name: enums.ListSubcommandOption.OnlyVariant,
				description: 'Only show variant cards',
				required: false,
			},
		],
	},

	async onApplicationCommand({ interaction, user, options }) {
		// Set the defaults
		let listUserId = user.id
		let pageNumber = 1
		let onlyRarity: number | undefined
		let onlyInverted: boolean | undefined
		let onlyVariant: boolean | undefined

		// Parse the options
		if (options) {
			const searchOptions = listUtils.parseSearchOptions(options)

			listUserId = searchOptions.userId ?? listUserId
			pageNumber = searchOptions.page ?? pageNumber
			onlyRarity = searchOptions.onlyRarity
			onlyInverted = searchOptions.onlyInverted
			onlyVariant = searchOptions.onlyVariant
		}

		if (pageNumber < 1) return simpleEphemeralResponse('The page number cannot be less than 1.')

		const duplicateList = await listDuplicates({
			userId: listUserId,
			onlyRarity,
			onlyInverted,
			onlyVariant,
		})

		if (duplicateList.length === 0) {
			return embedMessageResponse(
				errorEmbed(
					'No duplicates found.',
					await getTitle(user, listUserId),
					listUtils.getRequestedByAuthor(user, listUserId),
				),
			)
		}

		const list = listMessage.createListMessage({
			action: 'catcha/duplicates',
			listDataString: listUtils.buildListDataString({ userId: listUserId, onlyRarity, onlyInverted, onlyVariant }),

			items: duplicateList,
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

		const duplicatesList = await listDuplicates({
			userId: listData.userId,
			onlyRarity: listData.onlyRarity,
			onlyInverted: listData.onlyInverted,
			onlyVariant: listData.onlyVariant,
		})

		if (duplicatesList.length === 0) {
			return messageResponse({
				embeds: [
					errorEmbed(
						'No duplicates found.',
						interaction.message.embeds[0]?.title,
						listUtils.getRequestedByAuthor(user, listData.userId),
					),
				],
				update: true,
			})
		}

		const newList = listMessage.scrollListMessage({
			action: 'catcha/duplicates',
			pageData,
			listDataString,

			items: duplicatesList,

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
