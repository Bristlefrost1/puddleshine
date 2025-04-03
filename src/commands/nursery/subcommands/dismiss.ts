import * as DAPI from 'discord-api-types/v10'

import { simpleEphemeralResponse } from '@/discord/responses'
import { parseCommandOptions } from '@/discord/parse-options'
import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import * as nurseryViews from '@/commands/nursery/nursery-views'
import * as nurseryDB from '@/commands/nursery/db/nursery-db'
import { buildAlertsBlock } from './alerts'
import { bot } from '@/bot'

import { type Subcommand } from '@/commands'
import { type NurseryAlert } from '../game/nursery-alerts'

import * as config from '@/config'

const SUBCOMMAND_NAME = 'dismiss'

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Dismiss alerts.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'count',
				description:
					'The number of alerts to dismiss (starting from the oldest) or "all" to dismiss all of them.',
				required: true,
			},
		],
	},

	async onApplicationCommand(options) {
		const { count: countOption } = parseCommandOptions(options.options)

		if (!countOption || countOption.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No count option provided.')

		const nursery = await nurseryManager.getNursery(options.user)

		if (nursery.alerts.length === 0) {
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ['No alerts to dismiss.', ...buildAlertsBlock(nursery.alerts)],
				noAlerts: true,
			})
		}

		if (countOption.value.trim().toLowerCase() === 'all') {
			nursery.alerts = []

			await nurseryDB.updateNurseryAlerts(bot.prisma, nursery.uuid, JSON.stringify(nursery.alerts))

			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ['Dismissed all of your alerts.', ...buildAlertsBlock(nursery.alerts)],
				noAlerts: true,
			})
		}

		const countToDismiss = Number.parseInt(countOption.value.trim())

		if (isNaN(countToDismiss) || countToDismiss === 0) {
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ['The count entered is not valid.', ...buildAlertsBlock(nursery.alerts)],
				noAlerts: true,
			})
		}

		if (countToDismiss > 0) {
			nursery.alerts = nursery.alerts.slice(undefined, -1 * countToDismiss)
		} else {
			nursery.alerts = nursery.alerts.slice(Math.abs(countToDismiss))
		}

		await nurseryDB.updateNurseryAlerts(bot.prisma, nursery.uuid, JSON.stringify(nursery.alerts))

		return nurseryViews.nurseryMessageResponse(nursery, {
			view: 'home',
			messages: [`Dismissed ${Math.abs(countToDismiss)} alerts.`, ...buildAlertsBlock(nursery.alerts)],
			noAlerts: true,
		})
	},
} as Subcommand
