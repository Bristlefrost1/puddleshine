import * as DAPI from 'discord-api-types/v10'

import { deferMessage, editInteractionResponse } from '@/discord/responses-deferred'
import { parseCommandOptions } from '@/discord/parse-options'
import { parseList } from '@/utils/parse-list'
import { getPronouns } from '@/cat/gender'
import { bot } from '@/bot'

import * as nurseryDB from '@/commands/nursery/db/nursery-db'
import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import * as nurseryViews from '@/commands/nursery/nursery-views'
import { addNewEventToKit, KitEventType } from '@/commands/nursery/game/kit-events'
import { type Kit } from '@/commands/nursery/game/kit'

import * as config from '@/config'

import { type Subcommand } from '@/commands'

const SUBCOMMAND_NAME = 'medicine'

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: "Take kits to the medicine den if they're sick.",

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kits',
				description: 'The kits to take to see the medicine cat ("all" to take all of them)',
				required: true,
			},
		],
	},

	async onApplicationCommand(options) {
		const deferredExecute = async () => {
			try {
				const interactionToken = options.interaction.token

				const { kits: kitsOption } = parseCommandOptions(options.options)

				if (!kitsOption || kitsOption.type !== DAPI.ApplicationCommandOptionType.String) return

				const kitNames = parseList(kitsOption.value) as string[]
				const nursery = await nurseryManager.getNursery(options.user)

				if (nursery.isPaused) {
					await editInteractionResponse(
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: ['Your nursery is currently paused.'],
						}).data!,
					)

					return
				}

				if (nursery.kits.length < 1) {
					await editInteractionResponse(
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: ["You don't have any kits to take to the medicine den."],
						}).data!,
					)

					return
				}

				const kits = nurseryManager.locateKits(nursery, kitNames)

				if (kits.length < 1) {
					await editInteractionResponse(
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'status',
							messages: ["Couldn't find kits with the provided input."],
						}).data!,
					)

					return
				}

				const messages: string[] = []
				const treatKits: Kit[] = []

				for (const kit of kits) {
					const pronouns = getPronouns(kit.gender)

					if (kit.sickSince === undefined) {
						messages.push(
							`${kit.fullName} is feeling well and doesn't need to be taken to the medicine den.`,
						)
						continue
					}

					if (kit.wanderingSince !== undefined) {
						messages.push(`You can't see ${kit.fullName} anywhere to take ${pronouns.object} to the medicine den.`)
						continue
					}

					kit.sickSince = undefined
					kit.bond -= config.NURSERY_MEDICINE_BOND_DECREASE
					if (kit.bond < 0) kit.bond = 0

					addNewEventToKit(
						kit,
						KitEventType.Medicine,
						'{{KIT_FULL_NAME}} was treated for sickness in the medicine den.',
					)

					treatKits.push(kit)
					messages.push(
						`You took ${kit.fullName} to see the medicine cat, who immediately treated ${pronouns.object} for sickness.`,
					)

					nursery.kits[kit.index] = kit
					nursery.kitsNeedingAttention = nursery.kitsNeedingAttention.filter(
						(kitNeedingAttention) => kitNeedingAttention.uuid !== kit.uuid,
					)
				}

				if (treatKits.length > 0) await nurseryDB.setKitsSickSince(bot.prisma, treatKits, null)

				await editInteractionResponse(
					interactionToken,
					nurseryViews.nurseryMessageResponse(nursery, {
						view: 'status',
						messages: messages,
					}).data!,
				)
			} catch (error) {
				console.error(error)
			}
		}

		bot.ctx.waitUntil(deferredExecute())

		return deferMessage()
	},
} as Subcommand
