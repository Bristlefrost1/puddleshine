import * as DAPI from 'discord-api-types/v10';

import { messageResponse } from '#discord/responses.js';

import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
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
		const nursery = await nurseryManager.getNursery(options.user, options.env, true);

		return nurseryViews.nurseryMessageResponse(nursery, { view: 'status' });
	},
};

export default StatusSubcommand;
