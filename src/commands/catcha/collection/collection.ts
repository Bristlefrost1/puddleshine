import * as DAPI from 'discord-api-types/v10';

import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import * as archive from '#commands/catcha/archive/archive.js';

type Card = Awaited<ReturnType<typeof catchaDB.getCardCollection>>[0];
type CollectionCard = { position: number; card: Card };
type Collection = CollectionCard[];

function getCardKey(cardId: number, inverted?: boolean, variant?: string) {
	return `${cardId}:${variant !== undefined ? variant : ''}:${inverted ? '1' : '0'}`;
}

function parseCardKey(cardKey: string): { cardId: number; inverted: boolean; variant?: string } {
	const splitKey = cardKey.split(':');

	const cardId = Number.parseInt(splitKey[0]);
	const variant = splitKey[1].length > 0 ? splitKey[1] : undefined;
	const inverted = splitKey[2] === '1' ? true : false;

	return { cardId, variant, inverted };
}

async function getCollection(
	discordId: string,
	env: Env,
	searchOptions?: {
		rarity?: number;
		onlyInverted?: boolean;
		onlyVariant?: boolean;
		onlyVariantIds?: string[];
		onlyCardIds?: number[];
	},
): Promise<Collection> {
	const dbCollection = await catchaDB.getCardCollection(env.PRISMA, discordId);
	if (dbCollection.length === 0) return [];

	const sortedCollection = dbCollection
		.toSorted((a, b) => {
			const timestampA = a.obtainedAt.getTime();
			const timestampB = b.obtainedAt.getTime();

			if (timestampA !== timestampB) {
				return timestampA - timestampB;
			} else {
				const cardAName = archive.getCardDetailsById(a.cardId)!.name;
				const cardBName = archive.getCardDetailsById(b.cardId)!.name;

				return cardAName.localeCompare(cardBName, 'en');
			}
		})
		.filter((card) => card.burned === null || card.burned === false);

	const collection: { position: number; card: (typeof dbCollection)[0] }[] = [];

	for (let i = 0; i < sortedCollection.length; i++) {
		const card = sortedCollection[i];

		if (searchOptions) {
			const cardArchiveDetails = archive.getCardDetailsById(card.cardId)!;

			let matchesSearchCriteria = true;

			if (searchOptions.rarity && searchOptions.rarity !== cardArchiveDetails.rarity) {
				matchesSearchCriteria = false;
			}

			if (searchOptions.onlyInverted !== undefined) {
				if (card.isInverted !== searchOptions.onlyInverted) matchesSearchCriteria = false;
			}

			if (searchOptions.onlyVariant !== undefined) {
				if (searchOptions.onlyVariant === true) {
					if (card.variant === null) {
						matchesSearchCriteria = false;
					} else {
						if (searchOptions.onlyVariantIds && searchOptions.onlyVariantIds.length > 0) {
							if (!searchOptions.onlyVariantIds.includes(card.variant)) matchesSearchCriteria = false;
						}
					}
				} else {
					if (card.variant !== null) matchesSearchCriteria = false;
				}
			}

			if (searchOptions.onlyCardIds && !searchOptions.onlyCardIds.includes(card.cardId)) {
				matchesSearchCriteria = false;
			}

			if (!matchesSearchCriteria) continue;
		}

		collection.push({ position: i + 1, card: card });
	}

	return collection;
}

async function getCardCounts(
	discordId: string,
	env: Env,
	searchOptions?: {
		rarity?: number;
		onlyInverted?: boolean;
		onlyVariant?: boolean;
		onlyVariantIds?: string[];
		onlyCardIds?: number[];
	},
) {
	const cardCounts = new Map<string, number>();
	const userCollection = await getCollection(discordId, env, searchOptions);

	for (const collectionCard of userCollection) {
		const cardData = collectionCard.card;
		const cardKey = getCardKey(cardData.cardId, cardData.isInverted, cardData.variant ?? undefined);

		const oldCardCount = cardCounts.get(cardKey);
		let newCount: number;

		if (oldCardCount !== undefined) {
			newCount = oldCardCount + 1;
		} else {
			newCount = 1;
		}

		cardCounts.set(cardKey, newCount);
	}

	return cardCounts;
}

export { getCardKey, parseCardKey, getCollection, getCardCounts };
export type { Card, CollectionCard, Collection };
