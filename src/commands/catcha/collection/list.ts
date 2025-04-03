import * as DAPI from 'discord-api-types/v10'
import { type CatchaCard } from '@prisma/client'

import * as archive from '@/commands/catcha/archive'
import * as enums from '@/commands/catcha/catcha-enums'
import * as starString from '@/utils/star-string'
import { type Collection } from './collection'
import { CollectionSort } from './sort'

export type ListData = {
	userId: string
	onlyRarity?: number
	onlyInverted?: boolean
	onlyVariant?: boolean
	sort?: CollectionSort
}

export function getRequestedByAuthor(requestedBy: DAPI.APIUser, userId: string) {
	let author: DAPI.APIEmbedAuthor | undefined = undefined

	if (requestedBy.id !== userId) {
		author = {
			name: `Requested by: ${requestedBy.username}${requestedBy.discriminator === '0' ? '' : '#' + requestedBy.discriminator}`,
			icon_url: `https://cdn.discordapp.com/avatars/${requestedBy.id}/${requestedBy.avatar}.webp`,
		}
	}

	return author
}

export function stringifyCards(cards: CatchaCard[]) {
	const stringifiedCards: string[] = []

	for (let i = 0; i < cards.length; i++) {
		const card = cards[i]
		const variant = card.variant

		const cardId = card.cardId
		const isInverted = card.isInverted
		const cardDetails = archive.getCachedCardDetailsById(cardId)

		if (cardDetails === undefined) {
			stringifiedCards.push(`[FAILED TO GET CARD DETAILS, CARDID ${cardId}]`)
		} else {
			const rarity = cardDetails.rarity

			stringifiedCards.push(
				`[#${cardId}] ${archive.getCardFullName({ card: cardDetails, inverted: isInverted, variant: variant ?? undefined })} ${starString.createStarString(rarity, isInverted)}`,
			)
		}
	}

	return stringifiedCards
}

export function stringifyCollection(collection: Collection) {
	const stringifiedCards: string[] = []

	for (let i = 0; i < collection.length; i++) {
		const card = collection[i]
		const position = card.position
		const variant = card.card.variant

		const cardId = card.card.cardId
		const isInverted = card.card.isInverted
		const cardDetails = archive.getCachedCardDetailsById(cardId)

		if (cardDetails === undefined) {
			stringifiedCards.push(`[FAILED TO GET CARD DETAILS, CARDID ${cardId}]`)
		} else {
			const rarity = cardDetails.rarity

			stringifiedCards.push(
				`[${position}] [#${cardId}] ${archive.getCardFullName({ card: cardDetails, inverted: isInverted, variant: variant ?? undefined })} ${starString.createStarString(rarity, isInverted)}`,
			)
		}
	}

	return stringifiedCards
}

export function parseSearchOptions(options: DAPI.APIApplicationCommandInteractionDataBasicOption[]) {
	let userId: string | undefined
	let page: number | undefined
	let onlyRarity: number | undefined
	let onlyInverted: boolean | undefined
	let onlyVariant: boolean | undefined
	let sort: CollectionSort | undefined

	for (const option of options) {
		switch (option.name) {
			case enums.ListSubcommandOption.User:
				if (option.type === DAPI.ApplicationCommandOptionType.User) userId = option.value
				continue

			case enums.ListSubcommandOption.Page:
				if (option.type === DAPI.ApplicationCommandOptionType.Integer) page = option.value
				continue

			case enums.ListSubcommandOption.Rarity:
				if (option.type === DAPI.ApplicationCommandOptionType.Integer) onlyRarity = option.value
				continue

			case enums.ListSubcommandOption.OnlyInverted:
				if (option.type === DAPI.ApplicationCommandOptionType.Boolean) onlyInverted = option.value
				continue

			case enums.ListSubcommandOption.OnlyVariant:
				if (option.type === DAPI.ApplicationCommandOptionType.Boolean) onlyVariant = option.value
				continue

			case enums.ListSubcommandOption.Sort:
				if (option.type === DAPI.ApplicationCommandOptionType.String) sort = option.value as any
				continue

			default:
				continue
		}
	}

	return {
		userId: userId,
		page: page,
		onlyRarity: onlyRarity,
		onlyInverted: onlyInverted,
		onlyVariant: onlyVariant,
		sort,
	}
}

export function buildListDataString(listData: ListData) {
	let onlyInvertedString = ''
	let onlyVariantString = ''

	if (listData.onlyInverted !== undefined) {
		onlyInvertedString = listData.onlyInverted ? '1' : '0'
	}

	if (listData.onlyVariant !== undefined) {
		onlyVariantString = listData.onlyVariant ? '1' : '0'
	}

	return `${listData.userId},${listData.onlyRarity ?? '0'},${onlyInvertedString},${onlyVariantString},${listData.sort ?? ''}`
}

export function parseListDataString(dataString: string): ListData {
	const listData = dataString.split(',')

	const listUserId = listData[0]
	const onlyRarity = listData[1] !== '0' ? Number.parseInt(listData[1]) : undefined
	const onlyInverted = listData[2] === '' ? undefined : Boolean(Number.parseInt(listData[2]))
	const onlyVariant = listData[3] === '' ? undefined : Boolean(Number.parseInt(listData[3]))
	const sort: CollectionSort | undefined = listData[4] === '' ? undefined : (listData[4] as any)

	return {
		userId: listUserId,
		onlyRarity: onlyRarity,
		onlyInverted: onlyInverted,
		onlyVariant: onlyVariant,
		sort,
	}
}
