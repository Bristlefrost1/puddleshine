import * as DAPI from 'discord-api-types/v10';

import { simpleEphemeralResponse } from '#discord/responses.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import { buildAlertsBlock } from './alerts.js';

import type { Subcommand } from '#commands/subcommand.js';
import type { NurseryAlert } from '../game/nursery-alerts.js';

import * as config from '#config.js';

const SUBCOMMAND_NAME = 'dismiss';

const DismissSubcommand: Subcommand = {
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

	async execute(options) {
		const { count: countOption } = parseCommandOptions(options.commandOptions);

		if (!countOption || countOption.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No count option provided.');

		const nursery = await nurseryManager.getNursery(options.user, options.env);

		if (nursery.alerts.length === 0) {
			return nurseryViews.nurseryMessageResponse(
				nursery,
				['No alerts to dismiss.', ...buildAlertsBlock(nursery.alerts)],
				true,
				true,
			);
		}

		if (countOption.value.trim().toLowerCase() === 'all') {
			nursery.alerts = [];

			await nurseryDB.updateNurseryAlerts(options.env.PRISMA, nursery.uuid, JSON.stringify(nursery.alerts));

			return nurseryViews.nurseryMessageResponse(
				nursery,
				['Dismissed all of your alerts.', ...buildAlertsBlock(nursery.alerts)],
				true,
				true,
			);
		}

		const countToDismiss = Number.parseInt(countOption.value.trim());

		if (isNaN(countToDismiss) || countToDismiss === 0) {
			return nurseryViews.nurseryMessageResponse(
				nursery,
				['The count entered is not valid.', ...buildAlertsBlock(nursery.alerts)],
				true,
				true,
			);
		}

		if (countToDismiss > 0) {
			nursery.alerts = nursery.alerts.slice(undefined, -1 * countToDismiss);
		} else {
			nursery.alerts = nursery.alerts.slice(Math.abs(countToDismiss));
		}

		await nurseryDB.updateNurseryAlerts(options.env.PRISMA, nursery.uuid, JSON.stringify(nursery.alerts));

		return nurseryViews.nurseryMessageResponse(
			nursery,
			[`Dismissed ${Math.abs(countToDismiss)} alerts.`, ...buildAlertsBlock(nursery.alerts)],
			true,
			true,
		);
	},
};

export default DismissSubcommand;
