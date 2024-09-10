import * as DAPI from 'discord-api-types/v10';

import * as archive from '#commands/catcha/archive/archive.js';

import type { Collection } from '#commands/catcha/collection/collection.js';
import type { CompareFoundCard } from '#commands/catcha/collection/subcommands/compare.js';

type Order = 'ASC' | 'DESC';

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

enum CompareSort {
	DuplicatesAsc = 'DuplicatesAsc',
	DuplicatesDesc = 'DuplicatesDesc',

	AlphabeticalAsc = 'AlphabeticalAsc',
	AlphabeticalDesc = 'AlphabeticalDesc',

	CardIdAsc = 'CardIDAsc',
	CardIdDesc = 'CardIDDesc',
}

const collectionSortChoices: DAPI.APIApplicationCommandOptionChoice<string>[] = [
	{
		name: 'Default - Claim Time (Ascending)',
		value: CollectionSort.ClaimTimeAsc,
	},
	{
		name: 'Claim Time (Descending)',
		value: CollectionSort.ClaimTimeDesc,
	},
	{
		name: 'Alphabetical (Ascending)',
		value: CollectionSort.AlphabeticalAsc,
	},
	{
		name: 'Alphabetical (Descending)',
		value: CollectionSort.AlphabeticalDesc,
	},
	{
		name: 'Card ID (Ascending)',
		value: CollectionSort.CardIdAsc,
	},
	{
		name: 'Card ID (Descending)',
		value: CollectionSort.CardIdDesc,
	},
	{
		name: 'Rarity (Ascending)',
		value: CollectionSort.RarityAsc,
	},
	{
		name: 'Rarity (Descending)',
		value: CollectionSort.RarityDesc,
	},
];

const compareSortChoices: DAPI.APIApplicationCommandOptionChoice<string>[] = [
	{
		name: 'Duplicates (Ascending)',
		value: CompareSort.DuplicatesAsc,
	},
	{
		name: 'Default - Duplicates (Descending)',
		value: CompareSort.DuplicatesDesc,
	},
	{
		name: 'Alphabetical (Ascending)',
		value: CompareSort.AlphabeticalAsc,
	},
	{
		name: 'Alphabetical (Descending)',
		value: CompareSort.AlphabeticalDesc,
	},
	{
		name: 'Card ID (Ascending)',
		value: CompareSort.CardIdAsc,
	},
	{
		name: 'Card ID (Descending)',
		value: CompareSort.CardIdDesc,
	},
];

function compareAlphabetical(cardAName: string, cardBName: string, order: Order) {
	if (order === 'ASC') {
		return cardAName.localeCompare(cardBName, 'en');
	} else {
		return cardBName.localeCompare(cardAName, 'en');
	}
}

function compareCardId(cardAId: number, cardBId: number, order: Order) {
	if (order === 'ASC') {
		return cardAId - cardBId;
	} else {
		return cardBId - cardAId;
	}
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

				return compareAlphabetical(cardAName, cardBName, order);
			}
		} else if (sort.startsWith('Alphabetical')) {
			const cardAName = archive.getCardDetailsById(a.card.cardId)!.name;
			const cardBName = archive.getCardDetailsById(b.card.cardId)!.name;

			return compareAlphabetical(cardAName, cardBName, order);
		} else if (sort.startsWith('CardID')) {
			return compareCardId(a.card.cardId, b.card.cardId, order);
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

function sortCompareFoundCards(cards: CompareFoundCard[], sort: CompareSort) {
	let sortedCards: CompareFoundCard[] = [];
	const order = sort.endsWith('Asc') ? 'ASC' : 'DESC';

	sortedCards = cards.toSorted((a, b) => {
		if (sort.startsWith('Duplicates')) {
			if (order === 'ASC') {
				return a.count - b.count;
			} else {
				return b.count - a.count;
			}
		} else if (sort.startsWith('Alphabetical')) {
			const cardAName = archive.getCardDetailsById(a.cardId)!.name;
			const cardBName = archive.getCardDetailsById(b.cardId)!.name;

			return compareAlphabetical(cardAName, cardBName, order);
		} else if (sort.startsWith('CardID')) {
			return compareCardId(a.cardId, b.cardId, order);
		} else {
			return 0;
		}
	});

	return sortedCards;
}

export {
	CollectionSort,
	CompareSort,
	collectionSortChoices,
	compareSortChoices,
	sortCollection,
	sortCompareFoundCards,
};
