import * as DAPI from 'discord-api-types/v10';

import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import * as nurseryDB from '#commands/nursery/db/nursery-db.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'pause';

const PauseSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: "Pause your nursery if you can't look after your kits for a while.",

		options: [],
	},

	async execute(options) {
		const nursery = await nurseryManager.getNursery(options.user, options.env);

		if (nursery.isPaused) {
			await nurseryDB.unpauseNursery(options.env.PRISMA, nursery, nursery.kits);

			nursery.isPaused = false;

			return nurseryViews.nurseryMessageResponse(nursery, ["You've returned to take care of your kits."], false);
		} else {
			await nurseryDB.pauseNursery(options.env.PRISMA, nursery, nursery.kits);

			nursery.isPaused = true;

			return nurseryViews.nurseryMessageResponse(
				nursery,
				[
					"You let the other cats in the nursery to take care of your kits while you're gone.",
					'Do [pause] again to resume.',
				],
				false,
			);
		}
	},
};

export default PauseSubcommand;
