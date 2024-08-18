import * as DAPI from 'discord-api-types/v10';

import { messageResponse } from '#discord/responses.js';

import * as db from '#db/database.js';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryStatus from '#commands/nursery/game/nursery-status.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'status';

const StatusSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'See the status of your nursery and kits.',

		options: [],
	},

	async execute(options) {
		const userId = options.user.id;

		const profile = await db.findProfileWithDiscordId(options.env.PRISMA, userId);
		const nursery = await nurseryDB.getNursery(options.env.PRISMA, userId);

		const foodMeter = nurseryStatus.getFood(nursery);

		let displayName = options.user.username;
		if (profile && profile.name) displayName = profile.name;

		return messageResponse({
			content: nurseryViews.buildNurseryStatusView({
				displayName,

				season: 'Greenleaf',

				foodPoints: foodMeter.foodPoints,
				nextFoodPointPercetage: foodMeter.nextFoodPointPercentage,
			}),
		});
	},
};

export default StatusSubcommand;
