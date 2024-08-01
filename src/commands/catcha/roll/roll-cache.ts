import * as collection from '#commands/catcha/collection/collection.js';
import { getCurrentEvent } from '#commands/catcha/event/event.js';

import * as rollPeriod from './roll-period.js';
import * as randomizer from './randomizer.js';

import * as config from '#config.js';

import type { Catcha } from '@prisma/client';

type CachedRoll = {
	randomCardId: number;
	isInverted: boolean;
	variant?: string;
	variantDataIndex?: number;
	alreadyInCollection: number;
};

type RollCache = {
	cacheRollPeriod: number;
	invalidateAfter: number;

	rolls: CachedRoll[];
};

function getRollFromCache(catcha: Catcha, rollNumber: number): CachedRoll | void {
	if (catcha.rollCache === null) return;

	const currentRollPeriod = rollPeriod.getCurrentRollPeriod();
	const currentUnixTime = Math.floor(new Date().getTime() / 1000);

	const rollCache: RollCache = JSON.parse(catcha.rollCache);

	if (rollCache.cacheRollPeriod !== currentRollPeriod) return;
	if (currentUnixTime > rollCache.invalidateAfter) return;

	const rollIndex = rollNumber - 1;
	const rollFromCache = rollCache.rolls[rollIndex];

	if (!rollFromCache) return;

	return rollFromCache;
}

async function generateCache(userDiscordId: string, userUuid: string, env: Env): Promise<RollCache> {
	const currentRollPeriod = rollPeriod.getCurrentRollPeriod();
	const currentUnixTime = Math.floor(new Date().getTime() / 1000);

	const currentEvent = await getCurrentEvent(env);
	const cardCounts = await collection.getCardCounts(userDiscordId, env);

	const rolls: CachedRoll[] = [];

	for (let roll = 1; roll <= config.CATCHA_MAX_ROLLS; roll++) {
		const randomCard = randomizer.randomizeCard(currentEvent);
		let cardsAlreadyInCollection =
			cardCounts.get(collection.getCardKey(randomCard.cardId, false, randomCard.variant)) ?? 0;
		const isInverted = randomizer.randomizeInverted(cardsAlreadyInCollection);

		cardsAlreadyInCollection =
			cardCounts.get(collection.getCardKey(randomCard.cardId, isInverted, randomCard.variant)) ?? 0;

		rolls.push({
			randomCardId: randomCard.cardId,
			isInverted,
			variant: randomCard.variant,
			variantDataIndex: randomCard.variantIndex,
			alreadyInCollection: cardsAlreadyInCollection,
		});
	}

	return {
		cacheRollPeriod: currentRollPeriod,
		invalidateAfter: currentUnixTime + 900, // 900 seconds = 15 minutes
		rolls,
	};
}

export { getRollFromCache, generateCache };
