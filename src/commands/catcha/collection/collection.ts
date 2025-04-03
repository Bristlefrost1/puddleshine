import * as DAPI from 'discord-api-types/v10'

import * as catchaDB from '@/db/catcha-db'
import * as archive from '@/commands/catcha/archive'
import { bot } from '@/bot'

export type Card = Awaited<ReturnType<typeof catchaDB.getCardCollection>>[0]
export type CollectionCard = { position: number, card: Card }
export type Collection = CollectionCard[]

export type CollectionSearchOptions = {
	rarity?: number
	onlyInverted?: boolean
	onlyVariant?: boolean
	onlyVariantIds?: string[]
	onlyCardIds?: number[]

	archive?: archive.Archive
}

export type CollectionRemainingSearchOptions = {
	onlyRarity?: number
	onlyInverted?: boolean

	guildId?: string
}

export function getCardKey(cardId: number, inverted?: boolean, variant?: string) {
	return `${cardId}:${variant !== undefined ? variant : ''}:${inverted ? '1' : '0'}`
}

export function parseCardKey(cardKey: string): { cardId: number; inverted: boolean; variant?: string } {
	const splitKey = cardKey.split(':')

	const cardId = Number.parseInt(splitKey[0])
	const variant = splitKey[1].length > 0 ? splitKey[1] : undefined
	const inverted = splitKey[2] === '1' ? true : false

	return { cardId, variant, inverted }
}

export async function getCollection(discordId: string, searchOptions?: CollectionSearchOptions): Promise<Collection> {
	const collection: Collection = []

	const dbCollection = await catchaDB.getCardCollection(bot.prisma, discordId)
	if (dbCollection.length === 0) return []

	const wholeArchive = searchOptions?.archive ?? await archive.getArchive()

	const sortedCollection = dbCollection
		.filter((card) => card.burned === null || card.burned === false)
		.toSorted((a, b) => {
			const timestampA = a.obtainedAt.getTime()
			const timestampB = b.obtainedAt.getTime()

			if (timestampA !== timestampB) {
				return timestampA - timestampB
			} else {
				const cardADetails = archive.getCardDetailsByArchiveAndId(wholeArchive, a.cardId)
				const cardBDetails = archive.getCardDetailsByArchiveAndId(wholeArchive, b.cardId)

				const cardAName = cardADetails !== undefined ? cardADetails.name : ''
				const cardBName = cardBDetails !== undefined ? cardBDetails.name : ''

				return cardAName.localeCompare(cardBName, 'en')
			}
		})

	for (let i = 0; i < sortedCollection.length; i++) {
		const card = sortedCollection[i]
		const cardArchiveDetails = archive.getCardDetailsByArchiveAndId(wholeArchive, card.cardId)

		if (cardArchiveDetails === undefined) continue

		if (searchOptions) {
			let matchesSearchCriteria = true

			if (searchOptions.rarity && searchOptions.rarity !== cardArchiveDetails.rarity) {
				matchesSearchCriteria = false
			}

			if (searchOptions.onlyInverted !== undefined) {
				if (card.isInverted !== searchOptions.onlyInverted) matchesSearchCriteria = false
			}

			if (searchOptions.onlyVariant !== undefined) {
				if (searchOptions.onlyVariant === true) {
					if (card.variant === null) {
						matchesSearchCriteria = false
					} else {
						if (searchOptions.onlyVariantIds && searchOptions.onlyVariantIds.length > 0) {
							if (!searchOptions.onlyVariantIds.includes(card.variant)) matchesSearchCriteria = false
						}
					}
				} else {
					if (card.variant !== null) matchesSearchCriteria = false
				}
			}

			if (searchOptions.onlyCardIds && !searchOptions.onlyCardIds.includes(card.cardId)) {
				matchesSearchCriteria = false
			}

			if (!matchesSearchCriteria) continue
		}

		collection.push({ position: i + 1, card: card })
	}

	return collection
}

export async function getCardCounts(discordId: string, searchOptions?: CollectionSearchOptions) {
	const cardCounts = new Map<string, number>()
	const userCollection = await getCollection(discordId, searchOptions)

	for (const collectionCard of userCollection) {
		const cardData = collectionCard.card
		const cardKey = getCardKey(cardData.cardId, cardData.isInverted, cardData.variant ?? undefined)

		const oldCardCount = cardCounts.get(cardKey)
		let newCount: number

		if (oldCardCount !== undefined) {
			newCount = oldCardCount + 1
		} else {
			newCount = 1
		}

		cardCounts.set(cardKey, newCount)
	}

	return cardCounts
}

export async function getRemainingCardIds(discordId: string, searchOptions?: CollectionRemainingSearchOptions) {
	const wholeArchive = await archive.getArchive()
	const userCollection = await getCollection(discordId, {
		rarity: searchOptions?.onlyRarity,
		onlyInverted: searchOptions?.onlyInverted,
		onlyVariant: false, // Exclude variants

		archive: wholeArchive,
	})

	const hasCardId = new Map<number, boolean>()

	for (const collectionCard of userCollection) hasCardId.set(collectionCard.card.cardId, true)

	let allCardIds: number[] = []

	if (searchOptions?.onlyRarity !== undefined) {
		const cardIdsByRarity = await archive.getCardIdsByRarity()
		allCardIds = cardIdsByRarity.get(searchOptions.onlyRarity) ?? []
	} else {
		allCardIds = await archive.getAllCardIds()
	}

	let remainingCardIds = allCardIds
		.filter((cardId) => !hasCardId.get(cardId))
		.toSorted((cardIdA, cardIdB) => {
			const aDetails = archive.getCardDetailsByArchiveAndId(wholeArchive, cardIdA)
			const bDetails = archive.getCardDetailsByArchiveAndId(wholeArchive, cardIdB)

			const aFullName = aDetails !== undefined ? archive.getCardFullName({ card: aDetails }) : ''
			const bFullName = bDetails !== undefined ? archive.getCardFullName({ card: bDetails }) : ''

			return aFullName.localeCompare(bFullName, 'en')
		})

	remainingCardIds = remainingCardIds.filter((cardId) => {
		const details = archive.getCardDetailsByArchiveAndId(wholeArchive, cardId)

		if (details === undefined) return false

		if (searchOptions?.guildId) {
			if (
				details.onlyGuildIds &&
				details.onlyGuildIds.length > 0 &&
				!details.onlyGuildIds.includes(searchOptions.guildId)
			) {
				return false
			}
		} else {
			if (details.onlyGuildIds && details.onlyGuildIds.length > 0) return false
		}

		return true
	})

	return remainingCardIds
}
