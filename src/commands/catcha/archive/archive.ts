import cards from '#resources/.compiled/cards.compiled.json' with { type: 'json' };

import * as config from '#config.js';

function getArchive() {
	return cards.archive;
}

function getCardDetailsById(cardId: number): (typeof cards.archive)[0] | undefined {
	return cards.archive[cardId];
}

function getAllCardIds() {
	return cards.idsByRarity.flat();
}

function getCardIdsWithRarity(rarity: number) {
	return cards.idsByRarity[rarity - 1]; // JSON indexing starts at 0
}

function getCardShortName(cardId: number, inverted?: boolean, variant?: number | string, disambiguator?: boolean) {
	const card = cards.archive[cardId];
	if (!card) return '';

	let name = card.name;
	let isVariant = false;

	if (variant !== undefined && card.variants && card.variants.length > 0) {
		if (typeof variant === 'number') {
			const variantData = card.variants[variant];

			name = variantData.name;
			isVariant = true;
		} else {
			const indexes = card.variantDataIndexes as {
				[variant: string]: number | undefined;
			};
			const variantIndex = indexes[variant];

			if (variantIndex !== undefined) {
				const variantData = card.variants[variantIndex];

				name = variantData.name;
				isVariant = true;
			}
		}
	}

	if (disambiguator) {
		if (!isVariant && card.disambiguator.length > 0) {
			// The variant name should disambiguate enough
			name = `${name} (${card.disambiguator})`;
		}
	}

	if (inverted) name = `Inverted ${name}`;

	return name;
}

function getCardFullName(cardId: number, inverted?: boolean, variant?: number | string) {
	const card = cards.archive[cardId];
	if (!card) return '';

	let fullName = getCardShortName(cardId, inverted, variant, false);
	let disambiguator = '';

	if (variant === undefined && card.disambiguator.length > 0) {
		disambiguator = ` (${card.disambiguator})`;
	}

	if (card.group === 'Kittypet' || card.group === 'Loner' || card.group === 'Rogue') {
		fullName = `${fullName} the ${card.group.toLowerCase()}${disambiguator}`;
	} else {
		fullName = `${fullName} from ${card.group}${disambiguator}`;
	}

	return fullName;
}

function searchForCardIds(searchTerm: string) {
	const results: number[] = [];

	const wholeArchive = getArchive();
	const cardsThatStartWith = wholeArchive.filter((card) => {
		const fullName = getCardFullName(card.id);
		const lowercaseSearchTerm = searchTerm.toLocaleLowerCase('en');

		return fullName.toLocaleLowerCase('en').startsWith(lowercaseSearchTerm);
	});

	for (const card of cardsThatStartWith) {
		results.push(card.id);
	}

	return results;
}

function getCardColor(isInverted: boolean, isVariant: boolean): number | undefined {
	if (isInverted && isVariant) {
		return config.INVERTED_VARIANT_COLOR;
	} else if (isVariant) {
		return config.VARIANT_COLOR;
	} else if (isInverted) {
		return config.INVERTED_COLOR;
	}

	return;
}

export {
	getArchive,
	getCardDetailsById,
	getAllCardIds,
	getCardIdsWithRarity,
	getCardShortName,
	searchForCardIds,
	getCardFullName,
	getCardColor,
};
