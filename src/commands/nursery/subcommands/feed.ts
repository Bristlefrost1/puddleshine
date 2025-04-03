import * as DAPI from 'discord-api-types/v10'

import { deferMessage, editInteractionResponse } from '@/discord/responses-deferred'
import { simpleEphemeralResponse } from '@/discord/responses'
import { parseCommandOptions } from '@/discord/parse-options'
import { parseList } from '@/utils/parse-list'
import { bot } from '@/bot'

import * as nurseryDB from '@/commands/nursery/db/nursery-db'
import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import * as nurseryViews from '@/commands/nursery/nursery-views'
import { addNewEventToKit, findLastEventofType, KitEventType } from '@/commands/nursery/game/kit-events'

import * as config from '@/config'

import type { Subcommand } from '@/commands'

const SUBCOMMAND_NAME = 'feed'

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Feed your kits.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kits',
				description: 'The kits to feed by name or position ("all" to feed all of them at once)',
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

				const feedMessages: string[] = []
				const feedTime = new Date()
				const feedTimestamp = Math.floor(feedTime.getTime() / 1000)
				const kitNamesToFeed = parseList(kitsOption.value) as string[]

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
							messages: ["You don't have any kits to feed."],
						}).data!,
					)

					return
				}

				let kitsToFeed = nurseryManager.locateKits(nursery, kitNamesToFeed)

				if (kitsToFeed.length < 1) {
					await editInteractionResponse(
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'status',
							messages: ["Couldn't find kits with the provided input."],
						}).data!,
					)

					return;
				}

				kitsToFeed = kitsToFeed.filter((kit) => {
					if (kit.wanderingSince !== undefined) {
						feedMessages.push(`You can't see ${kit.fullName} anywhere.`)
						return false
					}

					const lastFeedEvent = findLastEventofType(kit, KitEventType.Feed)
					if (!lastFeedEvent) return true

					const secondsSinceLastFeed = feedTimestamp - lastFeedEvent.timestamp

					if (secondsSinceLastFeed < config.NURSERY_FEED_COOLDOWN && kit.hunger >= 0.7) {
						feedMessages.push(`${kit.fullName} complains about not being hungry and refuses to eat.`)
						return false
					}

					return true
				})

				if (kitsToFeed.length < 1) {
					await editInteractionResponse(
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'status',
							messages: feedMessages,
						}).data!,
					)

					return
				}

				const foodPointsNeeded = kitsToFeed.length * config.NURSERY_FEED_FOOD_POINTS

				if (foodPointsNeeded > nursery.food.foodPoints) {
					await editInteractionResponse(
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'status',
							messages: ["You don't have enough food to feed the kits."],
						}).data!,
					)

					return
				}

				nursery.food.foodPoints -= foodPointsNeeded
				nursery.food.food -= foodPointsNeeded

				const dbUpdate = kitsToFeed.map((kit) => {
					let hunger = kit.hunger + config.NURSERY_FEED_HUNGER_REGEN
					if (hunger > 1) hunger = 1

					nursery.kits[kit.index].hunger = hunger
					feedMessages.push(`You've fed ${kit.fullName}.`)

					addNewEventToKit(kit, KitEventType.Feed, '{{KIT_FULL_NAME}} was fed.')

					return { uuid: kit.uuid, hunger, events: JSON.stringify(kit.events) }
				})

				await nurseryDB.feedKits(bot.prisma, nursery.uuid, feedTime, nursery.food.food, dbUpdate)

				await editInteractionResponse(
					interactionToken,
					nurseryViews.nurseryMessageResponse(nursery, {
						view: 'status',
						messages: feedMessages,
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
