import * as DAPI from 'discord-api-types/v10';

import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import { formatSeconds } from '#utils/date-time-utils.js';

import type { Subcommand } from '#commands/subcommand.js';
import type { NurseryAlert } from '../game/nursery-alerts.js';

import * as config from '#config.js';

const SUBCOMMAND_NAME = 'alerts';

function buildAlertsBlock(alerts: NurseryAlert[]) {
	const currentTimestamp = Math.floor(new Date().getTime() / 1000);
	const lines: string[] = [];

	lines.push('```');
	lines.push(`Last ${config.NURSERY_MAX_ALERTS} alerts (newest first):`);

	if (alerts.length > 0) {
		alerts.forEach((alert) => {
			const secondsSince = currentTimestamp - alert.timestamp;
			const formattedSeconds = formatSeconds(secondsSince);

			lines.push(`[${formattedSeconds}] ${alert.alert}`);
		});
	} else {
		lines.push("You don't have any alerts.");
	}

	lines.push('```');

	return lines;
}

const AlertsSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'View all of your alerts.',

		options: [],
	},

	async execute(options) {
		const nursery = await nurseryManager.getNursery(options.user, options.env);

		const lines: string[] = [];

		lines.push('Dismiss oldest alerts by using /nursery dismiss (count | "all")');
		lines.push(...buildAlertsBlock(nursery.alerts));

		return nurseryViews.nurseryMessageResponse(nursery, lines, true, true);
	},
};

export { buildAlertsBlock };
export default AlertsSubcommand;
