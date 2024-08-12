import * as DAPI from 'discord-api-types/v10';

import * as archive from '#commands/catcha/archive/archive.js';

function getArtistAutocompleChoices(searchQuery: string): DAPI.APIApplicationCommandOptionChoice<string>[] {
	if (searchQuery.trim() === '') return [];

	const artistChoices: DAPI.APIApplicationCommandOptionChoice<string>[] = [];
	const allArtists = new Map<string, string>();
	const fullArchive = archive.getArchive();

	for (const card of fullArchive) {
		if (card.art && card.art.length > 0) {
			for (const art of card.art) {
				if (art.credit && art.credit.length > 0 && !allArtists.get(art.credit)) {
					allArtists.set(art.credit, art.credit);
				}
			}
		}

		if (card.variants && card.variants.length > 0) {
			for (const variant of card.variants) {
				if (variant.art && variant.art.length > 0) {
					for (const art of variant.art) {
						if (art.credit && art.credit.length > 0 && !allArtists.get(art.credit)) {
							allArtists.set(art.credit, art.credit);
						}
					}
				}
			}
		}
	}

	for (const [key, value] of allArtists) {
		if (value.toLowerCase().startsWith(searchQuery.toLowerCase())) {
			artistChoices.push({ name: value, value });
		}
	}

	return artistChoices.toSorted((a, b) => a.value.localeCompare(b.value, 'en'));
}

export { getArtistAutocompleChoices };
