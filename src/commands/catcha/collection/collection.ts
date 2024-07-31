import * as DAPI from 'discord-api-types/v10';

import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import * as archive from '#commands/catcha/archive/archive.js';

type Card = Awaited<ReturnType<typeof catchaDB.getCardCollection>>[0];
type CollectionCard = { position: number; card: Card };
type Collection = CollectionCard[];

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

	const sortedCollection = dbCollection.toSorted((a, b) => {
		const timestampA = a.obtainedAt.getTime();
		const timestampB = b.obtainedAt.getTime();

		if (timestampA !== timestampB) {
			return timestampA - timestampB;
		} else {
			const cardAName = archive.getCardDetailsById(a.cardId)!.name;
			const cardBName = archive.getCardDetailsById(b.cardId)!.name;

			return cardAName.localeCompare(cardBName, 'en');
		}
	});

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

export { getCollection };
export type { Card, CollectionCard, Collection };
