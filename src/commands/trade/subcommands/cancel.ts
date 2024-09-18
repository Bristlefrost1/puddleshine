import * as DAPI from 'discord-api-types/v10';

import * as listMessage from '#discord/list-message.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import {
	messageResponse,
	simpleEphemeralResponse,
	embedMessageResponse,
	errorEmbed,
	simpleMessageResponse,
} from '#discord/responses.js';

import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import * as tradeDB from '#commands/trade/db/trade-db.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'cancel';

const CancelSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Cancel a trade request.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.User,
				name: 'user',
				description: "The user with whom you have a trade request that you'd like to cancel",
				required: true,
			},
		],
	},

	async execute(options) {
		let userIdOption: string | undefined = undefined;

		for (const option of options.commandOptions ?? []) {
			switch (option.name) {
				case 'user':
					if (option.type === DAPI.ApplicationCommandOptionType.User) userIdOption = option.value;
					continue;
				default:
					continue;
			}
		}

		if (!userIdOption) return simpleEphemeralResponse("You haven't provided the required user option.");

		const userCatcha = await catchaDB.findCatcha(options.env.PRISMA, options.user.id);
		const otherUserCatcha = await catchaDB.findCatcha(options.env.PRISMA, userIdOption);

		if (userCatcha && otherUserCatcha) {
			const pendingTradeUuids = (
				await tradeDB.findTradesBetweenUsers(
					options.env.PRISMA,
					userCatcha.userUuid,
					otherUserCatcha.userUuid,
					false,
				)
			).map((trade) => trade.tradeUuid);

			if (pendingTradeUuids.length > 0) {
				await tradeDB.deleteTrades(options.env.PRISMA, pendingTradeUuids);
			}
		}

		return {
			type: DAPI.InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Canceled all pending trades with <@${userIdOption}>.`,
				allowed_mentions: {
					users: [],
					roles: [],
				},
			},
		};
	},
};

export default CancelSubcommand;
