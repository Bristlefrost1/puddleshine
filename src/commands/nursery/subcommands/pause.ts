import * as DAPI from 'discord-api-types/v10'

import { deferMessage, editInteractionResponse } from '@/discord/responses-deferred'
import { bot } from '@/bot'
import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import * as nurseryViews from '@/commands/nursery/nursery-views'
import * as nurseryDB from '@/commands/nursery/db/nursery-db'

import { type Subcommand } from '@/commands'

const SUBCOMMAND_NAME = 'pause'

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: "Pause your nursery if you can't look after your kits for a while.",

		options: [],
	},

	async onApplicationCommand(options) {
		const deferredExecute = async () => {
			try {
				const interactionToken = options.interaction.token

				const nursery = await nurseryManager.getNursery(options.user)

				if (nursery.isPaused) {
					await nurseryDB.unpauseNursery(bot.prisma, nursery, nursery.kits)

					nursery.isPaused = false

					await editInteractionResponse(
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: ["You've returned to take care of your kits."],
						}).data!,
					)
				} else {
					await nurseryDB.pauseNursery(bot.prisma, nursery, nursery.kits)

					nursery.isPaused = true

					await editInteractionResponse(
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: [
								"You let the other cats in the nursery to take care of your kits while you're gone.",
								'Do [pause] again to resume.',
							],
						}).data!,
					)
				}
			} catch (error) {
				console.log(error)
			}
		}

		bot.ctx.waitUntil(deferredExecute())

		return deferMessage()
	},
} as Subcommand
