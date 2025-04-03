import * as DAPI from 'discord-api-types/v10'

import * as discordUserApi from '@/discord/api/discord-user'
import * as listMessage from '@/discord/list-message'
import * as collection from '@/commands/catcha/collection/collection'
import * as listUtils from '@/commands/catcha/collection/list'
import * as enums from '@/commands/catcha/catcha-enums'
import { bot } from '@/bot'
import { messageResponse, simpleEphemeralResponse, embedMessageResponse, errorEmbed } from '@/discord/responses'
import { CollectionSort, sortCollection, collectionSortChoices } from '@/commands/catcha/collection/sort'
import { commonSearchOptions } from '@/commands/catcha/utils/common-search-options'
import { type Subcommand } from '@/commands'

async function getTitle(requestedBy: DAPI.APIUser, userId: string) {
	let title = ''

	if (userId === requestedBy.id) {
		const discriminator = requestedBy.discriminator === '0' ? '' : `#${requestedBy.discriminator}`
		title = `${requestedBy.username}${discriminator}'s collection`
	} else {
		const discordUserFromId = await discordUserApi.discordGetUser({ id: userId, token: bot.env.DISCORD_TOKEN })

		if (discordUserFromId) {
			const discriminator = discordUserFromId.discriminator === '0' ? '' : `#${discordUserFromId.discriminator}`
			title = `${discordUserFromId.username}${discriminator}'s collection`
		} else {
			title = `${userId}'s collection`
		}
	}

	return title
}

async function listUserCollection(
	options: {
		userId: string;

		onlyRarity?: number;
		onlyInverted?: boolean;
		onlyVariant?: boolean;
		sort?: CollectionSort;
	},
): Promise<string[]> {
	let userCollection = await collection.getCollection(options.userId, {
		rarity: options.onlyRarity,
		onlyInverted: options.onlyInverted,
		onlyVariant: options.onlyVariant,
	})

	if (userCollection.length === 0) return []

	if (options.sort) userCollection = sortCollection(userCollection, options.sort)

	const collectionList = listUtils.stringifyCollection(userCollection)

	return collectionList
}

export default {
	name: 'list',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'list',
		description: "View your or another user's collection.",
	
		options: commonSearchOptions.concat([
			{
				type: DAPI.ApplicationCommandOptionType.Boolean,
				name: enums.ListSubcommandOption.OnlyVariant,
				description: 'Only show variant cards',
				required: false,
			},
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: enums.ListSubcommandOption.Sort,
				description: 'Choose how to sort the cards',
				required: false,

				choices: collectionSortChoices,
			},
		]),
	},

	async onApplicationCommand({ interaction, user, subcommand, options }) {
		// Set the defaults
		let listUserId = user.id
		let pageNumber = 1
		let onlyRarity: number | undefined
		let onlyInverted: boolean | undefined
		let onlyVariant: boolean | undefined
		let sort: CollectionSort | undefined

		// Parse the options
		if (options) {
			const searchOptions = listUtils.parseSearchOptions(options)

			listUserId = searchOptions.userId ?? listUserId
			pageNumber = searchOptions.page ?? pageNumber
			onlyRarity = searchOptions.onlyRarity
			onlyInverted = searchOptions.onlyInverted
			onlyVariant = searchOptions.onlyVariant
			sort = searchOptions.sort
		}

		if (pageNumber < 1) return simpleEphemeralResponse('The page number cannot be less than 1.')

		const collectionList = await listUserCollection({
			userId: listUserId,
			onlyRarity,
			onlyInverted,
			onlyVariant,
			sort,
		})

		if (collectionList.length === 0) {
			return embedMessageResponse(
				errorEmbed(
					'No cards found.',
					await getTitle(user, listUserId),
					listUtils.getRequestedByAuthor(user, listUserId),
				),
			)
		}

		const list = listMessage.createListMessage({
			action: 'catcha/list',
			listDataString: listUtils.buildListDataString({ userId: listUserId, onlyRarity, onlyInverted, onlyVariant, sort }),

			items: collectionList,
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

		const collectionList = await listUserCollection({
			userId: listData.userId,
			onlyRarity: listData.onlyRarity,
			onlyInverted: listData.onlyInverted,
			onlyVariant: listData.onlyVariant,
			sort: listData.sort,
		})

		if (collectionList.length === 0) {
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
			action: 'catcha/list',
			pageData,
			listDataString,

			items: collectionList,

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
