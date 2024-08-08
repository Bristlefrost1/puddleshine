import * as archive from '#commands/catcha/archive/archive.js';

import type { Collection } from '#commands/catcha/collection/collection.js';

enum CollectionSort {
	ClaimTimeAsc = 'ClaimTimeAsc',
	ClaimTimeDesc = 'ClaimTimeDesc',

	AlphabeticalAsc = 'AlphabeticalAsc',
	AlphabeticalDesc = 'AlphabeticalDesc',

	CardIdAsc = 'CardIDAsc',
	CardIdDesc = 'CardIDDesc',

	RarityAsc = 'RarityAsc',
	RarityDesc = 'RarityDesc',
}

function sortCollection(collection: Collection, sort: CollectionSort): Collection {
	let sortedCollection: Collection = [];
	const order = sort.endsWith('Asc') ? 'ASC' : 'DESC';

	sortedCollection = collection.toSorted((a, b) => {
		if (sort.startsWith('ClaimTime')) {
			const timestampA = a.card.obtainedAt.getTime();
			const timestampB = b.card.obtainedAt.getTime();

			if (timestampA !== timestampB) {
				if (order === 'ASC') {
					return timestampA - timestampB;
				} else {
					return timestampB - timestampA;
				}
			} else {
				const cardAName = archive.getCardDetailsById(a.card.cardId)!.name;
				const cardBName = archive.getCardDetailsById(b.card.cardId)!.name;

				if (order === 'ASC') {
					return cardAName.localeCompare(cardBName, 'en');
				} else {
					return cardBName.localeCompare(cardAName, 'en');
				}
			}
		} else if (sort.startsWith('Alphabetical')) {
			const cardAName = archive.getCardDetailsById(a.card.cardId)!.name;
			const cardBName = archive.getCardDetailsById(b.card.cardId)!.name;

			if (order === 'ASC') {
				return cardAName.localeCompare(cardBName, 'en');
			} else {
				return cardBName.localeCompare(cardAName, 'en');
			}
		} else if (sort.startsWith('CardID')) {
			if (order === 'ASC') {
				return a.card.cardId - b.card.cardId;
			} else {
				return b.card.cardId - a.card.cardId;
			}
		} else if (sort.startsWith('Rarity')) {
			const cardARarity = archive.getCardDetailsById(a.card.cardId)!.rarity;
			const cardBRarity = archive.getCardDetailsById(b.card.cardId)!.rarity;

			if (cardARarity !== cardBRarity) {
				if (order === 'ASC') {
					return cardARarity - cardBRarity;
				} else {
					return cardBRarity - cardARarity;
				}
			} else {
				const cardAName = archive.getCardDetailsById(a.card.cardId)!.name;
				const cardBName = archive.getCardDetailsById(b.card.cardId)!.name;

				if (order === 'ASC') {
					return cardAName.localeCompare(cardBName, 'en');
				} else {
					return cardBName.localeCompare(cardAName, 'en');
				}
			}
		} else {
			return 0;
		}
	});

	return sortedCollection;
}

export { CollectionSort, sortCollection };
