import * as DAPI from 'discord-api-types/v10';

import { getArchive, getCardFullName } from './archive.js';

function getAutocompleteChoices(searchQuery: string): DAPI.APIApplicationCommandOptionChoice<string>[] {
	if (searchQuery.length === 0) {
		return [];
	}

	const lowercaseSearchQuery = searchQuery.toLocaleLowerCase('en');

	const cardFullNamesAndIds: { name: string; value: string }[] = [];

	const archive = getArchive();
	const cardsThatStartWith = archive.filter((card) =>
		card.name.toLocaleLowerCase('en').startsWith(lowercaseSearchQuery),
	);

	for (const card of cardsThatStartWith) {
		const cardId = card.id;
		const fullName = getCardFullName(cardId);

		cardFullNamesAndIds.push({
			name: fullName,
			value: cardId.toString(),
		});
	}

	const results = cardFullNamesAndIds
		.filter((card) => card.name.toLocaleLowerCase('en').startsWith(lowercaseSearchQuery))
		.toSorted((a, b) => a.name.localeCompare(b.name, 'en'))
		.slice(0, 10);

	return results;
}

export { getAutocompleteChoices };
