import { type Catcha } from '@prisma/client'

import { type ArchiveCard } from '@/commands/catcha/archive'
import * as collection from '@/commands/catcha/collection'
import * as rollPeriod from './roll-period'
import * as randomiser from './randomiser'

import * as config from '@/config'

export type CachedRoll = {
	randomCard: ArchiveCard
	isInverted: boolean
	variant?: string
	variantDataIndex?: number
	alreadyInCollection: number
}

export type RollCache = {
	cacheRollPeriod: number
	invalidateAfter: number

	rolls: CachedRoll[]
}

export function getRollFromCache(catcha: Catcha, rollNumber: number): CachedRoll | void {
	if (catcha.rollCache === null) return

	const currentRollPeriod = rollPeriod.getCurrentRollPeriod()
	const currentUnixTime = Math.floor(new Date().getTime() / 1000)

	const rollCache: RollCache = JSON.parse(catcha.rollCache)

	if (rollCache.cacheRollPeriod !== currentRollPeriod) return
	if (currentUnixTime > rollCache.invalidateAfter) return

	const rollIndex = rollNumber - 1
	const rollFromCache = rollCache.rolls[rollIndex]

	if (!rollFromCache) return

	return rollFromCache
}

export async function generateCachedRoll(userDiscordId: string, guildId?: string, cardCountsOption?: Map<string, number>): Promise<CachedRoll> {
	const cardCounts = cardCountsOption ?? await collection.getCardCounts(userDiscordId)

	const randomCard = await randomiser.randomiseCard(guildId)
	let cardsAlreadyInCollection = cardCounts.get(collection.getCardKey(randomCard.card.id, false, randomCard.variant?.name)) ?? 0
	const isInverted = randomiser.randomiseInverted(cardsAlreadyInCollection)

	cardsAlreadyInCollection = cardCounts.get(collection.getCardKey(randomCard.card.id, isInverted, randomCard.variant?.name)) ?? 0

	return {
		randomCard: randomCard.card,
		isInverted,
		variant: randomCard.variant?.name,
		variantDataIndex: randomCard.variantIndex,
		alreadyInCollection: cardsAlreadyInCollection,
	}
}

export async function generateCache(userDiscordId: string, userUuid: string, guildId?: string): Promise<RollCache> {
	const currentRollPeriod = rollPeriod.getCurrentRollPeriod()
	const currentUnixTime = Math.floor(new Date().getTime() / 1000)

	const cardCounts = await collection.getCardCounts(userDiscordId)

	const rolls: CachedRoll[] = []

	for (let roll = 1; roll <= config.CATCHA_MAX_ROLLS; roll++) {
		rolls.push(await generateCachedRoll(userDiscordId, guildId, cardCounts))
	}

	return {
		cacheRollPeriod: currentRollPeriod,
		invalidateAfter: currentUnixTime + 900, // 900 seconds = 15 minutes
		rolls,
	}
}
