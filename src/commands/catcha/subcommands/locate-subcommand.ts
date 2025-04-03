import * as DAPI from 'discord-api-types/v10'

import * as listMessage from '@/discord/list-message'
import { discordGetUser } from '@/discord/api/discord-user'
import { messageResponse, simpleEphemeralResponse, embedMessageResponse, errorEmbed } from '@/discord/responses'
import * as archive from '@/commands/catcha/archive'
import * as collection from '@/commands/catcha/collection'
import * as listUtils from '@/commands/catcha/collection/list'
import * as enums from '@/commands/catcha/catcha-enums'
import { bot } from '@/bot'
import { commonSearchOptions } from '@/commands/catcha/utils/common-search-options'
import { type Subcommand } from '@/commands'

async function getTitle(requestedBy: DAPI.APIUser, userId: string, searchingFor: string | number) {
	let title = ''

	if (userId === requestedBy.id) {
		const discriminator = requestedBy.discriminator === '0' ? '' : `#${requestedBy.discriminator}`
		title = `Searching ${requestedBy.username}${discriminator}'s collection for: "${searchingFor}"`
	} else {
		const discordUserFromId = await discordGetUser({ id: userId, token: bot.env.DISCORD_TOKEN })

		if (discordUserFromId) {
			const discriminator = discordUserFromId.discriminator === '0' ? '' : `#${discordUserFromId.discriminator}`
			title = `Searching ${discordUserFromId.username}${discriminator}'s collection for: "${searchingFor}"`
		} else {
			title = `Searching ${userId}'s collection for: "${searchingFor}"`
		}
	}

	return title
}

async function search(options: {
	searchString: string
	searchTerms: string[]
	userId: string

	onlyRarity?: number
	onlyInverted?: boolean
	onlyVariant?: boolean
}): Promise<string[]> {
	const onlyCardIds: number[] = []

	for (const searchTerm of options.searchTerms) {
		const trimmedSearchTerm = searchTerm.trim()
		const locateCardId = Number.parseInt(trimmedSearchTerm)

		if (!isNaN(locateCardId)) {
			onlyCardIds.push(locateCardId)
			continue
		}

		const cardsFromArchive = await archive.searchForCards(trimmedSearchTerm)

		cardsFromArchive.forEach((card) => onlyCardIds.push(card.id))
	}

	const userCollection = await collection.getCollection(options.userId, {
		rarity: options.onlyRarity,
		onlyInverted: options.onlyInverted,
		onlyVariant: options.onlyVariant,
		onlyCardIds: onlyCardIds,
	})

	if (userCollection.length === 0) return []

	const searchResults = listUtils.stringifyCollection(userCollection)

	return searchResults
}

export default {
	name: 'locate',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'locate',
		description: 'Search for a specific card from a collection.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'card',
				description: 'The card to search for (name or card ID)',
				required: true,
				autocomplete: true,
			},
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
		if (!options) return simpleEphemeralResponse('Options are required.')
		
		const searchOptions = listUtils.parseSearchOptions(options)
		const searchString = options[0].value as string

		const listUserId = searchOptions.userId ?? user.id
		const pageNumber = searchOptions.page ?? 1
		const onlyRarity = searchOptions.onlyRarity
		const onlyInverted = searchOptions.onlyInverted
		const onlyVariant = searchOptions.onlyVariant

		if (pageNumber < 1) return simpleEphemeralResponse('The page number cannot be less than 1.')

		const searchResults = await search({
			searchString: searchString,
			searchTerms: searchString
				.split(',')
				.map((value) => value.trim())
				.filter((value) => value.length > 0),
			userId: listUserId,

			onlyRarity,
			onlyInverted,
			onlyVariant,
		})

		if (searchResults.length === 0) {
			return embedMessageResponse(
				errorEmbed(
					'No cards found.',
					await getTitle(user, listUserId, searchString),
					listUtils.getRequestedByAuthor(user, listUserId),
				),
			)
		}

		const list = listMessage.createListMessage({
			action: 'catcha/locate',
			listDataString: listUtils.buildListDataString({ userId: listUserId, onlyRarity, onlyInverted, onlyVariant }),

			items: searchResults,
			pageNumber,

			title: await getTitle(user, listUserId, searchString),
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

		if (interaction.message.embeds[0] && interaction.message.embeds[0].title) {
			const embedTitle = interaction.message.embeds[0].title
			const searchString = embedTitle.split(': "')[1].slice(undefined, -1)

			const searchResults = await search({
				searchString: searchString,
				searchTerms: searchString
					.split(',')
					.map((value) => value.trim())
					.filter((value) => value.length > 0),
				userId: listData.userId,

				onlyRarity: listData.onlyRarity,
				onlyInverted: listData.onlyInverted,
				onlyVariant: listData.onlyVariant,
			})

			if (searchResults.length === 0) {
				return messageResponse({
					embeds: [
						errorEmbed(
							'No cards found.',
							interaction.message.embeds[0]?.title,
							listUtils.getRequestedByAuthor(user, listData.userId),
						),
					],
					update: true,
				})
			}

			const newList = listMessage.scrollListMessage({
				action: 'catcha/locate',
				pageData,
				listDataString,

				items: searchResults,

				title: interaction.message.embeds[0]?.title,
				author: listUtils.getRequestedByAuthor(user, listData.userId),
			})

			return messageResponse({
				embeds: [newList.embed],
				components: newList.scrollActionRow !== undefined ? [newList.scrollActionRow] : undefined,
				update: true,
			})
		} else {
			return simpleEphemeralResponse('Cannot find the search term.')
		}
	},
} as Subcommand
