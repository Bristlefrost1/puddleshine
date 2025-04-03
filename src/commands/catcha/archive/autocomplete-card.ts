import * as DAPI from 'discord-api-types/v10'

import { getCardFullName, searchForCards } from './archive'

export async function getAutocompleteChoices(searchQuery: string, guildId?: string): Promise<DAPI.APIApplicationCommandOptionChoice<string>[]> {
	if (searchQuery.length === 0) {
		return []
	}

	const lowercaseSearchQuery = searchQuery.toLocaleLowerCase('en')
	const cardFullNamesAndIds: { name: string; value: string }[] = []

	let cardsThatStartWith = await searchForCards(searchQuery)

	if (guildId !== undefined) {
		cardsThatStartWith = cardsThatStartWith.filter((card) => {
			if (card.onlyGuildIds && card.onlyGuildIds.length > 0) {
				return card.onlyGuildIds.includes(guildId)
			}

			return true
		})
	} else {
		cardsThatStartWith = cardsThatStartWith.filter(
			(card) => card.onlyGuildIds === undefined || card.onlyGuildIds.length === 0,
		)
	}

	for (const card of cardsThatStartWith) {
		const cardId = card.id
		const fullName = getCardFullName({ card })

		cardFullNamesAndIds.push({
			name: fullName,
			value: cardId.toString(),
		})
	}

	const results = cardFullNamesAndIds
		.filter((card) => card.name.toLocaleLowerCase('en').startsWith(lowercaseSearchQuery))
		.toSorted((a, b) => a.name.localeCompare(b.name, 'en'))
		.slice(0, 10)

	return results
}
