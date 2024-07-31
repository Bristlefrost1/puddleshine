import * as randomUtils from '#utils/random-utils.js';
import * as archive from '#commands/catcha/archive/archive.js';
import { getCurrentEvent } from '../event/event.js';

import * as config from '#config.js';

import type { WeightedValue } from '#utils/random-utils.js';

type RandomCard = {
	cardId: number;
	variant?: string;
	variantIndex?: number;
};

type Event = Awaited<ReturnType<typeof getCurrentEvent>>;

function randomizeRarity() {
	let rarity;

	const standardDeviation = Math.abs(5 - randomUtils.gaussianRandom() * 10);

	if (standardDeviation <= config.CATCHA_1S_MAX_STDEV) {
		rarity = 1;
	} else if (standardDeviation <= config.CATCHA_2S_MAX_STDEV) {
		rarity = 2;
	} else if (standardDeviation <= config.CATCHA_3S_MAX_STDEV) {
		rarity = 3;
	} else if (standardDeviation <= config.CATCHA_4S_MAX_STDEV) {
		rarity = 4;
	} else {
		rarity = 5;
	}

	return rarity;
}

function randomizeCardId(rarity: number, event: Event) {
	const cardIdsInRarity = archive.getCardIdsWithRarity(rarity);

	if (event && event.increase && event.increase.group) {
		const shouldBeGuaranteedEventCard: WeightedValue<boolean>[] = [
			{ value: true, probability: event.increaseBy },
			{ value: false, probability: '*' },
		];

		if (randomUtils.pickRandomWeighted(shouldBeGuaranteedEventCard)) {
			const cardIdsInGroup: number[] = cardIdsInRarity.filter((cardId) => {
				const cardDetails = archive.getCardDetailsById(cardId);

				return cardDetails?.group === event.increase.group;
			});

			if (cardIdsInGroup.length > 0) {
				return cardIdsInGroup[Math.floor(Math.random() * cardIdsInGroup.length)];
			} else {
				return cardIdsInRarity[Math.floor(Math.random() * cardIdsInRarity.length)];
			}
		} else {
			return cardIdsInRarity[Math.floor(Math.random() * cardIdsInRarity.length)];
		}
	} else {
		return cardIdsInRarity[Math.floor(Math.random() * cardIdsInRarity.length)];
	}
}

async function randomizeCard(env: Env): Promise<RandomCard> {
	const currentEvent = await getCurrentEvent(env);

	let rarity;

	if (currentEvent && currentEvent.increaseRarity) {
		const eventRarityOdds: WeightedValue<number>[] = [
			{
				value: currentEvent.increaseRarity,
				probability: currentEvent.increaseBy,
			},
			{ value: randomizeRarity(), probability: '*' },
		];

		rarity = randomUtils.pickRandomWeighted(eventRarityOdds);
	} else {
		rarity = randomizeRarity();
	}

	let randomCardId = randomizeCardId(rarity, currentEvent);
	// Change it for testing here // if (env.ENV === 'dev') randomCardId = randomCardId;

	const randomCardDetails = archive.getCardDetailsById(randomCardId);

	let variant: string | undefined;
	let variantIndex: number | undefined;

	if (randomCardDetails?.variants && randomCardDetails.variants.length > 0) {
		const variantOdds: WeightedValue<boolean>[] = [
			{ value: true, probability: config.CATCHA_VARIANT_CHANCE },
			{ value: false, probability: '*' },
		];

		const isVariant = randomUtils.pickRandomWeighted(variantOdds);

		if (isVariant) {
			variantIndex = Math.floor(Math.random() * randomCardDetails.variants.length);
			variant = randomCardDetails.variants[variantIndex].variant;
		}
	}

	return {
		cardId: randomCardId,
		variant,
		variantIndex,
	};
}

function randomizeInverted(duplicates: number) {
	if (duplicates === 0) return false;

	let invertedChance =
		config.CATCHA_INVERTED_BASE_CHANCE +
		(duplicates === 1 ? 0 : duplicates * config.CATCHA_INVERTED_CHANCE_INCREASE);

	if (config.CATCHA_INVERTED_CHANCE_MAX > 0 && invertedChance > config.CATCHA_INVERTED_CHANCE_MAX) {
		invertedChance = config.CATCHA_INVERTED_CHANCE_MAX;
	}

	const invertedOdds: WeightedValue<boolean>[] = [
		{ value: true, probability: invertedChance },
		{ value: false, probability: '*' },
	];

	return randomUtils.pickRandomWeighted(invertedOdds);
}

export { randomizeCard, randomizeInverted };
export type { RandomCard };
