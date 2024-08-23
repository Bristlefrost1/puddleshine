import * as DAPI from 'discord-api-types/v10';

import { messageResponse } from '#discord/responses.js';

import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'home';

const HomeSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'View your nursery.',

		options: [],
	},

	async execute(options) {
		const nursery = await nurseryManager.getNursery(options.user, options.env);

		return messageResponse({
			content: nurseryViews.buildNurseryHomeView(nursery),
		});
	},
};

export default HomeSubcommand;
