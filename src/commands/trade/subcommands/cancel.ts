import * as DAPI from 'discord-api-types/v10'

import { parseCommandOptions } from '@/discord/parse-options'
import { simpleEphemeralResponse } from '@/discord/responses'
import { bot } from '@/bot'

import * as catchaDB from '@/db/catcha-db'
import * as tradeDB from '@/commands/trade/db/trade-db'

import { type Subcommand } from '@/commands'

const SUBCOMMAND_NAME = 'cancel'

export default {
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

	async onApplicationCommand(options) {
		let userIdOption: string | undefined = undefined

		for (const option of options.options ?? []) {
			switch (option.name) {
				case 'user':
					if (option.type === DAPI.ApplicationCommandOptionType.User) userIdOption = option.value
					continue

				default:
					continue
			}
		}

		if (!userIdOption) return simpleEphemeralResponse("You haven't provided the required user option.")

		const userCatcha = await catchaDB.findCatcha(bot.prisma, options.user.id)
		const otherUserCatcha = await catchaDB.findCatcha(bot.prisma, userIdOption)

		if (userCatcha && otherUserCatcha) {
			const pendingTradeUuids = (
				await tradeDB.findTradesBetweenUsers(
					bot.prisma,
					userCatcha.userUuid,
					otherUserCatcha.userUuid,
					false,
				)
			).map((trade) => trade.tradeUuid)

			if (pendingTradeUuids.length > 0) {
				await tradeDB.deleteTrades(bot.prisma, pendingTradeUuids)
			}
		}

		return {
			type: DAPI.InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Cancelled all pending trades with <@${userIdOption}>.`,
				allowed_mentions: {
					users: [],
					roles: [],
				},
			},
		}
	},
} as Subcommand
