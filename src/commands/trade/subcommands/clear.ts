import * as DAPI from 'discord-api-types/v10';

import { simpleMessageResponse } from '#discord/responses.js';

import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import * as tradeDB from '#commands/trade/db/trade-db.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'clear';

const ClearSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Clear all of your pending trades.',

		options: [],
	},

	async execute(options) {
		const userCatcha = await catchaDB.findCatcha(options.env.PRISMA, options.user.id);

		if (userCatcha) {
			const pendingTradeUuids = (
				await tradeDB.findUserPendingTrades(options.env.PRISMA, userCatcha.userUuid)
			).map((trade) => trade.tradeUuid);

			if (pendingTradeUuids.length > 0) {
				await tradeDB.deleteTrades(options.env.PRISMA, pendingTradeUuids);
			}
		}

		return simpleMessageResponse('Cleared your pending trades.');
	},
};

export default ClearSubcommand;
