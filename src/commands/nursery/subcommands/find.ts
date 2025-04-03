import * as DAPI from 'discord-api-types/v10'

import { deferMessage, editInteractionResponse } from '@/discord/responses-deferred'
import { parseCommandOptions } from '@/discord/parse-options'
import { parseList } from '@/utils/parse-list'
import { pickRandomWeighted, WeightedValue } from '@/utils/random-utils'
import { bot } from '@/bot'

import * as nurseryDB from '@/commands/nursery/db/nursery-db'
import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import * as nurseryViews from '@/commands/nursery/nursery-views'
import { addNewEventToKit, KitEventType } from '@/commands/nursery/game/kit-events'

import { type Subcommand } from '@/commands'
import { type Kit } from '@/commands/nursery/game/kit'

import * as config from '@/config'

const kitFoundMessages: WeightedValue<string>[] = [
	{
		value: 'You found {{KIT_FULL_NAME}} wandering outside the camp. You scold your kit not to wander off.',
		probability: '*',
	},
	{
		value: "Thank StarClan! {{KIT_FULL_NAME}} was only in the elders' den listening to their stories.",
		probability: '*',
	},
	{
		value: '{{KIT_FULL_NAME}} was still in the nursery after all but out of sight.',
		probability: '*',
	},
]

const SUBCOMMAND_NAME = 'find'

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Find missing kits.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kits',
				description: 'The kits to look for ("all" to look for all of them)',
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
							messages: ["You don't have any kits to search for."],
						}).data!,
					)

					return
				}

				const kits = nurseryManager.locateKits(nursery, kitNames)

				if (kits.length < 1) {
					await editInteractionResponse(
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: ["Couldn't find kits with the provided input."],
						}).data!,
					)

					return
				}

				const messages: string[] = []
				const foundKits: Kit[] = []

				for (const kit of kits) {
					if (kit.wanderingSince === undefined) {
						messages.push(`${kit.fullName} is thankfully safe with you in the nursery.`)
						continue
					}

					const kitFoundOdds: WeightedValue<boolean>[] = [
						{ value: true, probability: 0.8 },
						{ value: false, probability: '*' },
					]
					const kitFound = pickRandomWeighted(kitFoundOdds)

					if (!kitFound) {
						messages.push(`Despite looking hard, you can't find ${kit.fullName} anywhere.`)
						continue
					}

					kit.wanderingSince = undefined
					kit.bond -= config.NURSERY_WANDER_BOND_DECREASE
					if (kit.bond < 0) kit.bond = 0

					addNewEventToKit(
						kit,
						KitEventType.Found,
						'{{KIT_FULL_NAME}} was found after having gone wandering.',
					)

					foundKits.push(kit)
					messages.push(pickRandomWeighted(kitFoundMessages).replaceAll('{{KIT_FULL_NAME}}', kit.fullName))

					nursery.kits[kit.index] = kit
				}

				if (foundKits.length < 1) {
					await editInteractionResponse(
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'status',
							messages: messages,
						}).data!,
					)

					return
				}

				await nurseryDB.setKitsWanderingSince(bot.prisma, foundKits, null)

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
