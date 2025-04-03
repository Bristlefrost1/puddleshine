import * as archive from '@/commands/catcha/archive'
import * as collection from '@/commands/catcha/collection'
import { bot } from '@/bot'

export type Stats = {
	totalProgress: number
	bonusProgress: number

	cardsProgress: number
	cardsTotal: number
	cardsUnique: number
	cardsUniqueOf: number

	starsProgress: number
	starsTotal: number
	starsUnique: number
	starsUniqueOf: number

	oneStars: number
	oneStarsOf: number
	twoStars: number
	twoStarsOf: number
	threeStars: number
	threeStarsOf: number
	fourStars: number
	fourStarsOf: number
	fiveStars: number
	fiveStarsOf: number

	variantsTotal: number
	variantsUnique: number

	invertedCardsProgress: number
	invertedCardsTotal: number
	invertedCardsUnique: number

	invertedStarsProgress: number
	invertedStarsTotal: number
	invertedStarsUnique: number

	invertedOneStars: number
	invertedTwoStars: number
	invertedThreeStars: number
	invertedFourStars: number
	invertedFiveStars: number

	invertedVariantsTotal: number
	invertedVariantsUnique: number
}

export async function buildUserStats(discordId: string, guildId?: string): Promise<Stats | void> {
	const filterArchiveGuildSpecific = (card: archive.ArchiveCard): boolean => {
		if (card.onlyGuildIds !== undefined && card.onlyGuildIds.length > 0) {
			if (guildId === undefined) return false
			if (!card.onlyGuildIds.includes(guildId)) return false
		}

		return true
	}

	const filterCollectionGuildSpecific = (collectionCard: collection.CollectionCard): boolean => {
		const archiveCard = archive.getCachedCardDetailsById(collectionCard.card.cardId)
		if (archiveCard === undefined) return false

		return filterArchiveGuildSpecific(archiveCard)
	}
	
	const cardArchive = (await archive.getArchive()).filter(filterArchiveGuildSpecific)
	const cardIdsByRarity = await archive.getCardIdsByRarity(cardArchive)
	const userCollection = (await collection.getCollection(discordId)).filter(filterCollectionGuildSpecific)

	if (!userCollection) return

	const normalCards: typeof userCollection = []
	const invertedCards: typeof userCollection = []
	const variants: typeof userCollection = []
	const invertedVariants: typeof userCollection = []

	let normalStars = 0
	let uniqueNormalStars = 0
	let invertedStars = 0
	let uniqueInvertedStars = 0

	const hasNormalCardId = new Map<number, boolean>()
	const hasInvertedCardId = new Map<number, boolean>()
	const hasVariant = new Map<string, boolean>()
	const hasInvertedVariant = new Map<string, boolean>()

	const has1s = new Map<number, boolean>()
	const hasInv1s = new Map<number, boolean>()
	const has2s = new Map<number, boolean>()
	const hasInv2s = new Map<number, boolean>()
	const has3s = new Map<number, boolean>()
	const hasInv3s = new Map<number, boolean>()
	const has4s = new Map<number, boolean>()
	const hasInv4s = new Map<number, boolean>()
	const has5s = new Map<number, boolean>()
	const hasInv5s = new Map<number, boolean>()

	for (const collectionCard of userCollection) {
		const card = collectionCard.card
		const cardDetails = archive.getCardDetailsByArchiveAndId(cardArchive, card.cardId)

		if (cardDetails === undefined) continue

		if (card.variant !== null) {
			const variantKey = `${card.cardId}@${card.variant}`

			if (card.isInverted) {
				hasInvertedVariant.set(variantKey, true)
				invertedVariants.push(collectionCard)
			} else {
				hasVariant.set(variantKey, true)
				variants.push(collectionCard)
			}
		} else if (card.isInverted) {
			switch (cardDetails.rarity) {
				case 1:
					hasInv1s.set(card.cardId, true)
					break
				case 2:
					hasInv2s.set(card.cardId, true)
					break
				case 3:
					hasInv3s.set(card.cardId, true)
					break
				case 4:
					hasInv4s.set(card.cardId, true)
					break
				case 5:
					hasInv5s.set(card.cardId, true)
					break
				default:
					break
			}

			if (hasInvertedCardId.get(card.cardId) === undefined) {
				uniqueInvertedStars += cardDetails.rarity
				hasInvertedCardId.set(card.cardId, true)
			}

			invertedStars += cardDetails.rarity
			invertedCards.push(collectionCard)
		} else {
			switch (cardDetails.rarity) {
				case 1:
					has1s.set(card.cardId, true)
					break
				case 2:
					has2s.set(card.cardId, true)
					break
				case 3:
					has3s.set(card.cardId, true)
					break
				case 4:
					has4s.set(card.cardId, true)
					break
				case 5:
					has5s.set(card.cardId, true)
					break
				default:
					break
			}

			if (hasNormalCardId.get(card.cardId) === undefined) {
				uniqueNormalStars += cardDetails.rarity
				hasNormalCardId.set(card.cardId, true)
			}

			normalStars += cardDetails.rarity
			normalCards.push(collectionCard)
		}
	}

	const cardsInArchive = cardArchive.length
	const starsInArchive = cardArchive
		.map((card) => card.rarity)
		.reduce((accumulator, currentValue) => accumulator + currentValue, 0)

	const oneStarsInArchive = (cardIdsByRarity.get(1) || []).length
	const twoStarsInArchive = (cardIdsByRarity.get(2) || []).length
	const threeStarsInArchive = (cardIdsByRarity.get(3) || []).length
	const fourStarsInArchive = (cardIdsByRarity.get(4) || []).length
	const fiveStarsInArchive = (cardIdsByRarity.get(5) || []).length

	const normalCardsProgress = (hasNormalCardId.size / cardsInArchive) * 100
	const normalStarsProgress = (uniqueNormalStars / starsInArchive) * 100
	const totalProgress = (normalCardsProgress + normalStarsProgress) / 2

	const invertedCardsProgress = (hasInvertedCardId.size / cardsInArchive) * 100
	const invertedStarsProgress = (uniqueInvertedStars / starsInArchive) * 100
	const bonusProgress = (invertedCardsProgress + invertedStarsProgress) / 2

	return {
		totalProgress,
		bonusProgress,

		cardsProgress: normalCardsProgress,
		cardsTotal: normalCards.length,
		cardsUnique: hasNormalCardId.size,
		cardsUniqueOf: cardsInArchive,

		starsProgress: normalStarsProgress,
		starsTotal: normalStars,
		starsUnique: uniqueNormalStars,
		starsUniqueOf: starsInArchive,

		oneStars: has1s.size,
		oneStarsOf: oneStarsInArchive,
		twoStars: has2s.size,
		twoStarsOf: twoStarsInArchive,
		threeStars: has3s.size,
		threeStarsOf: threeStarsInArchive,
		fourStars: has4s.size,
		fourStarsOf: fourStarsInArchive,
		fiveStars: has5s.size,
		fiveStarsOf: fiveStarsInArchive,

		variantsTotal: variants.length,
		variantsUnique: hasVariant.size,

		invertedCardsProgress,
		invertedCardsTotal: invertedCards.length,
		invertedCardsUnique: hasInvertedCardId.size,

		invertedStarsProgress,
		invertedStarsTotal: invertedStars,
		invertedStarsUnique: uniqueInvertedStars,

		invertedOneStars: hasInv1s.size,
		invertedTwoStars: hasInv2s.size,
		invertedThreeStars: hasInv3s.size,
		invertedFourStars: hasInv4s.size,
		invertedFiveStars: hasInv5s.size,

		invertedVariantsTotal: invertedVariants.length,
		invertedVariantsUnique: hasInvertedVariant.size,
	}
}
