import * as DAPI from 'discord-api-types/v10'

import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import * as nurseryViews from '@/commands/nursery/nursery-views'
import { type NurseryAlert } from '@/commands/nursery/game/nursery-alerts'
import { formatSeconds } from '@/utils/date-time-utils'

import { type Subcommand } from '@/commands'
import * as config from '@/config'

const SUBCOMMAND_NAME = 'alerts'

export function buildAlertsBlock(alerts: NurseryAlert[]) {
	const currentTimestamp = Math.floor(new Date().getTime() / 1000)
	const lines: string[] = []

	lines.push('```')
	lines.push(`Last ${config.NURSERY_MAX_ALERTS} alerts (newest first):`)

	if (alerts.length > 0) {
		alerts.forEach((alert) => {
			const secondsSince = currentTimestamp - alert.timestamp
			const formattedSeconds = formatSeconds(secondsSince)

			lines.push(`[${formattedSeconds}] ${alert.alert}`)
		})
	} else {
		lines.push("You don't have any alerts.")
	}

	lines.push('```')

	return lines
}

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'View all of your alerts.',

		options: [],
	},

	async onApplicationCommand(options) {
		const nursery = await nurseryManager.getNursery(options.user)

		const lines: string[] = []

		lines.push('Dismiss oldest alerts by using /nursery dismiss (count | "all")')
		lines.push(...buildAlertsBlock(nursery.alerts))

		return nurseryViews.nurseryMessageResponse(nursery, {
			view: 'home',
			messages: lines,
			noAlerts: true,
		})
	},
} as Subcommand
