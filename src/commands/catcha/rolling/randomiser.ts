import * as randomUtils from '@/utils/random-utils'
import * as archive from '@/commands/catcha/archive'
import { getCurrentEvent, type Event } from '@/commands/catcha/event'

import * as config from '@/config'

export type RandomCard = {
	card: archive.ArchiveCard
	variant?: archive.ArchiveCardVariant
	variantIndex?: number
}

function randomiseRarity() {
	let rarity

	const standardDeviation = Math.abs(5 - randomUtils.gaussianRandom() * 10)

	if (standardDeviation <= config.CATCHA_1S_MAX_STDEV) {
		rarity = 1
	} else if (standardDeviation <= config.CATCHA_2S_MAX_STDEV) {
		rarity = 2
	} else if (standardDeviation <= config.CATCHA_3S_MAX_STDEV) {
		rarity = 3
	} else if (standardDeviation <= config.CATCHA_4S_MAX_STDEV) {
		rarity = 4
	} else {
		rarity = 5
	}

	return rarity
}

async function chooseRandom(cardIds: number[], guildId?: string) {
	let randomIndex = Math.floor(Math.random() * cardIds.length)

	if (guildId) {
		let cardDetails = await archive.getCardDetailsById(cardIds[randomIndex]) as archive.ArchiveCard

		while (
			cardDetails.onlyGuildIds &&
			cardDetails.onlyGuildIds.length > 0 &&
			!cardDetails.onlyGuildIds.includes(guildId)
		) {
			randomIndex = Math.floor(Math.random() * cardIds.length)
			cardDetails = await archive.getCardDetailsById(cardIds[randomIndex]) as archive.ArchiveCard
		}
	} else {
		let cardDetails = await archive.getCardDetailsById(cardIds[randomIndex]) as archive.ArchiveCard

		while (cardDetails.onlyGuildIds && cardDetails.onlyGuildIds.length > 0) {
			randomIndex = Math.floor(Math.random() * cardIds.length)
			cardDetails = await archive.getCardDetailsById(cardIds[randomIndex]) as archive.ArchiveCard
		}
	}

	return cardIds[randomIndex]
}

async function randomiseCardId(rarity: number, event?: Event, guildId?: string) {
	const cardIdsInRarity = (await archive.getCardIdsByRarity()).get(rarity)!

	if (event && event.increase && event.increase.group) {
		const shouldBeGuaranteedEventCard: randomUtils.WeightedValue<boolean>[] = [
			{ value: true, probability: event.increaseBy },
			{ value: false, probability: '*' },
		]

		if (randomUtils.pickRandomWeighted(shouldBeGuaranteedEventCard)) {
			const cardIdsInGroup: number[] = cardIdsInRarity.filter((cardId) => {
				const cardDetails = archive.getCardDetailsByArchiveAndId(archive.cachedArchive!, cardId)

				return cardDetails?.group === event.increase.group
			})

			if (cardIdsInGroup.length > 0) {
				return await chooseRandom(cardIdsInGroup, guildId)
			} else {
				return await chooseRandom(cardIdsInRarity, guildId)
			}
		} else {
			return await chooseRandom(cardIdsInRarity, guildId)
		}
	} else {
		return await chooseRandom(cardIdsInRarity, guildId)
	}
}

export async function randomiseCard(guildId?: string): Promise<RandomCard> {
	const currentEvent = await getCurrentEvent()
	let rarity: number

	if (currentEvent && currentEvent.increase.rarity !== undefined) {
		const eventRarityOdds: randomUtils.WeightedValue<number>[] = [
			{
				value: currentEvent.increase.rarity,
				probability: currentEvent.increaseBy,
			},
			{ value: randomiseRarity(), probability: '*' },
		]

		rarity = randomUtils.pickRandomWeighted(eventRarityOdds)
	} else {
		rarity = randomiseRarity()
	}

	const randomCardId = await randomiseCardId(rarity, currentEvent, guildId)
	const randomCard = (await archive.getCardDetailsById(randomCardId))!

	let variant: archive.ArchiveCardVariant | undefined
	let variantIndex: number | undefined

	if (randomCard.variants && randomCard.variants.length > 0) {
		const variantOdds: randomUtils.WeightedValue<boolean>[] = [
			{ value: true, probability: config.CATCHA_VARIANT_CHANCE },
			{ value: false, probability: '*' },
		]

		const isVariant = randomUtils.pickRandomWeighted(variantOdds)

		if (isVariant) {
			variantIndex = Math.floor(Math.random() * randomCard.variants.length)
			variant = randomCard.variants[variantIndex]

			if (randomCard.variants[variantIndex].unrollable === true) {
				variantIndex = undefined
				variant = undefined
			}
		}
	}

	return {
		card: randomCard,
		variant,
		variantIndex,
	}
}

export function randomiseInverted(cardCount: number) {
	if (cardCount === 0) return false

	let invertedChance =
		config.CATCHA_INVERTED_BASE_CHANCE + (cardCount === 1 ? 0 : cardCount * config.CATCHA_INVERTED_CHANCE_INCREASE)

	if (config.CATCHA_INVERTED_CHANCE_MAX > 0 && invertedChance > config.CATCHA_INVERTED_CHANCE_MAX) {
		invertedChance = config.CATCHA_INVERTED_CHANCE_MAX
	}

	const invertedOdds: randomUtils.WeightedValue<boolean>[] = [
		{ value: true, probability: invertedChance },
		{ value: false, probability: '*' },
	]

	return randomUtils.pickRandomWeighted(invertedOdds)
}
