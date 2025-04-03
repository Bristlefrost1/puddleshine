import * as DAPI from 'discord-api-types/v10'

import { messageResponse } from '@/discord/responses'
import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import { getNextSeason } from '../game/seasons'
import { type Subcommand } from '@/commands'

import * as config from '@/config'

const SUBCOMMAND_NAME = 'cooldowns'

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Check the nursery schedule & see your active cooldowns.',

		options: [],
	},

	async onApplicationCommand(options) {
		const nursery = await nurseryManager.getNursery(options.user, true)
		const nextSeason = getNextSeason()

		const cooldowns: string[] = []

		if (nursery.lastBredAt) {
			const lastBreedTimestamp = Math.floor(nursery.lastBredAt.getTime() / 1000)
			const canBreedAt = lastBreedTimestamp + config.NURSERY_BREED_COOLDOWN

			if (canBreedAt > Math.floor(new Date().getTime() / 1000)) {
				cooldowns.push(`Breed cooldown: You can next breed on <t:${canBreedAt}:F> (<t:${canBreedAt}:R>).`)
			}
		}

		if (cooldowns.length === 0) cooldowns.push("You don't have any active cooldowns.")

		return messageResponse({
			embeds: [
				{
					title: 'Nursery Schedule & Cooldowns',
					fields: [
						{
							name: 'Season',
							value: `The current season is **${nursery.season.toLowerCase()}**.\nThe next season is **${nextSeason.nextSeason.toLowerCase()}**, which will start <t:${Math.floor(nextSeason.nextSeasonStartsAt.getTime() / 1000)}:R>.`,
						},
						{
							name: 'Cooldowns',
							value: cooldowns.join('\n'),
						},
					],
				},
			],
		})
	},
} as Subcommand
