import * as DAPI from 'discord-api-types/v10'

import * as archive from '@/commands/catcha/archive'
import * as art from '@/commands/catcha/art'
import { createStarString } from '@/utils/star-string'
import { simpleEphemeralResponse, embedMessageResponse, errorEmbed } from '@/discord/responses'
import { type Subcommand } from '@/commands'

export default {
	name: 'archive',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'archive',
		description: 'Look up cards that exist in Catcha.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'card',
				description: 'The card (by name or card ID) to look up',
				required: true,
				autocomplete: true,
			},
		],
	},

	async onApplicationCommand({ interaction, user, options }) {
		if (options === undefined) return simpleEphemeralResponse('No options provided')

		const searchTerm = options[0].value as string
		let foundCard: archive.ArchiveCard | undefined
		let showCardId = Number.parseInt(searchTerm.trim())

		if (isNaN(showCardId)) {
			const searchResults = await archive.searchForCards(searchTerm)
	
			if (searchResults.length === 0) {
				return embedMessageResponse(errorEmbed('The search returned no results.'))
			} else if (searchResults.length === 1) {
				foundCard = searchResults[0]
				showCardId = foundCard.id
			} else if (searchResults.length > 1) {
				if (searchResults.length > 15) {
					return embedMessageResponse(
						errorEmbed(`The search returned too many results to show (${searchResults.length}). Please narrow down your search.`),
					)
				}
	
				const lines: string[] = []
	
				for (const card of searchResults) {
					const rarity = card.rarity
	
					lines.push(`[#${card.id}] ${archive.getCardFullName({ card, inverted: false })} ${createStarString(rarity)}`)
				}
	
				return embedMessageResponse({
					title: 'Archive search results',
					description: lines.join('\n'),
					timestamp: new Date().toISOString(),
				})
			}
		} else {
			foundCard = await archive.getCardDetailsById(showCardId)
		}
	
		if (foundCard === undefined) return embedMessageResponse(errorEmbed(`No card found with the ID ${showCardId}.`))
	
		const cardName = archive.getCardShortName({ card: foundCard, inverted: false, variant: undefined, addDisambiguator: true })
		const randomArt = art.randomArt(foundCard)
	
		let components: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[] = []
		if (randomArt.totalArt && randomArt.artNumber && randomArt.totalArt > 1) {
			components = art.buildArtScrollComponents(foundCard.id, randomArt.artNumber, false)
		}
	
		return {
			type: DAPI.InteractionResponseType.ChannelMessageWithSource,
			data: {
				embeds: [
					await archive.buildCardEmbed({
						cardId: foundCard.id,
						cardName,
						gender: foundCard.gender,
						clan: foundCard.group,
						rarity: foundCard.rarity,
						isInverted: false,
						artUrl: randomArt.artUrl,
						artText: randomArt.artText,
					}),
				],
				components,
			},
		}
	}
} as Subcommand
