import * as DAPI from 'discord-api-types/v10'

import { simpleEphemeralResponse } from '@/discord/responses'
import { discordGetUser } from '@/discord/api/discord-user'
import { buildUserStats } from '@/commands/catcha/stats/stats-builder'
import { bot } from '@/bot'
import { type Subcommand } from '@/commands'

export default {
	name: 'stats',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'stats',
		description: "See your or another user's Catcha statistics.",

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.User,
				name: 'user',
				description: 'The user whose statistics to view',
				required: false,
			},
		],
	},

	async onApplicationCommand({ interaction, user, options }) {
		let userId = user.id;
		let username = user.username;

		if (options && options[0] && options[0].type === DAPI.ApplicationCommandOptionType.User) {
			userId = options[0].value

			const otherUser = await discordGetUser({ id: userId, token: bot.env.DISCORD_TOKEN })

			if (otherUser) {
				username = otherUser.username
			} else {
				username = userId
			}
		}

		const stats = await buildUserStats(userId, interaction.guild_id)

		if (!stats) return simpleEphemeralResponse("Couldn't fetch stats.")

		const statsString = `
Total progress: ${stats.totalProgress.toString().slice(0, 6)}%
Bonus progress: ${stats.bonusProgress.toString().slice(0, 6)}%

Cards:
  Progress:  ${stats.cardsProgress.toString().slice(0, 6)}%
  Total:     ${stats.cardsTotal}
  Unique:    ${stats.cardsUnique} of ${stats.cardsUniqueOf}
	
Stars:
  Progress:  ${stats.starsProgress.toString().slice(0, 6)}%
  Total:     ${stats.starsTotal}★
  Unique:    ${stats.starsUnique}★ of ${stats.starsUniqueOf}★
	
Rarities:
  1 star:   ${stats.oneStars} of ${stats.oneStarsOf}
  2 stars:  ${stats.twoStars} of ${stats.twoStarsOf}
  3 stars:  ${stats.threeStars} of ${stats.threeStarsOf}
  4 stars:  ${stats.fourStars} of ${stats.fourStarsOf}
  5 stars:  ${stats.fiveStars} of ${stats.fiveStarsOf}
	
Variants: ${stats.variantsTotal} (${stats.variantsUnique} unique)

v -- Inverted / Flipped -- v

Cards:
  Progress:  ${stats.invertedCardsProgress.toString().slice(0, 6)}%
  Total:     ${stats.invertedCardsTotal}
  Unique:    ${stats.invertedCardsUnique} of ${stats.cardsUniqueOf}
	
Stars:
  Progress:  ${stats.invertedStarsProgress.toString().slice(0, 6)}%
  Total:     ${stats.invertedStarsTotal}☆
  Unique:    ${stats.invertedStarsUnique}☆ of ${stats.starsUniqueOf}☆
	
Rarities:
  1 star:   ${stats.invertedOneStars} of ${stats.oneStarsOf}
  2 stars:  ${stats.invertedTwoStars} of ${stats.twoStarsOf}
  3 stars:  ${stats.invertedThreeStars} of ${stats.threeStarsOf}
  4 stars:  ${stats.invertedFourStars} of ${stats.fourStarsOf}
  5 stars:  ${stats.invertedFiveStars} of ${stats.fiveStarsOf}
	
Inverted Variants: ${stats.invertedVariantsTotal} (${stats.invertedVariantsUnique} unique)`

		return {
			type: DAPI.InteractionResponseType.ChannelMessageWithSource,
			data: {
				embeds: [
					{
						title: `${username}'s Catcha Statistics`,
						color: 0xfcdb53,
						description: '```' + statsString + '```',
						timestamp: new Date().toISOString(),
					},
				],
			},
		}
	},
} as Subcommand
