import * as DAPI from 'discord-api-types/v10';

import { errorEmbed, embedMessageResponse } from '#discord/responses.js';
import { createStarString } from '../utils/star-string.js';
import * as artScroll from '#commands/catcha/art/art-scroll.js';
import { randomArt } from '#commands/catcha/art/art.js';
import { buildCardEmbed } from '../collection/subcommands/view.js';
import * as archive from '#commands/catcha/archive/archive.js';

function onArchive(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): DAPI.APIInteractionResponse {
	const searchTerm = commandOptions[0].value as string;
	let showCardId = Number.parseInt(searchTerm.trim());

	if (isNaN(showCardId)) {
		const searchResults = archive.searchForCardIds(searchTerm);

		if (searchResults.length === 0) {
			return embedMessageResponse(errorEmbed('The search term returned no results.'));
		} else if (searchResults.length === 1) {
			showCardId = searchResults[0];
		} else if (searchResults.length > 1) {
			if (searchResults.length > 15) {
				return embedMessageResponse(
					errorEmbed('The search returned too many results to show. Please narrow down your search.'),
				);
			}

			const lines: string[] = [];

			searchResults.forEach((cardId) => {
				const rarity = archive.getCardDetailsById(cardId)!.rarity;

				lines.push(`[#${cardId}] ${archive.getCardFullName(cardId, false)} ${createStarString(rarity)}`);
			});

			return embedMessageResponse({
				title: 'Archive search results',
				description: lines.join('\n'),
				timestamp: new Date().toISOString(),
			});
		}
	}

	const cardDetails = archive.getCardDetailsById(showCardId);

	if (!cardDetails) return embedMessageResponse(errorEmbed(`No card found with the ID ${showCardId}.`));

	const cardName = archive.getCardShortName(cardDetails.id, false, undefined, true);
	const art = randomArt(cardDetails.id);

	let components: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[] = [];
	if (art.totalArt && art.artNumber && art.totalArt > 1) {
		components = artScroll.buildArtScrollComponents(cardDetails.id, art.artNumber, false);
	}

	return {
		type: DAPI.InteractionResponseType.ChannelMessageWithSource,
		data: {
			embeds: [
				buildCardEmbed({
					cardId: cardDetails.id,
					cardName,
					gender: cardDetails.gender,
					clan: cardDetails.group,
					rarity: cardDetails.rarity,
					isInverted: false,
					artUrl: art.artUrl,
					artText: art.artText,
				}),
			],
			components,
		},
	};
}

export { onArchive };
