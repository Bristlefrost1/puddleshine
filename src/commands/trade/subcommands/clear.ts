import * as DAPI from 'discord-api-types/v10'

import { simpleMessageResponse } from '@/discord/responses'
import { bot } from '@/bot'
import * as catchaDB from '@/db/catcha-db'
import * as tradeDB from '@/commands/trade/db/trade-db'

import { type Subcommand } from '@/commands'

const SUBCOMMAND_NAME = 'clear'

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Clear all of your pending trades.',

		options: [],
	},

	async onApplicationCommand(options) {
		const userCatcha = await catchaDB.findCatcha(bot.prisma, options.user.id)

		if (userCatcha) {
			const pendingTradeUuids = (
				await tradeDB.findUserPendingTrades(bot.prisma, userCatcha.userUuid)
			).map((trade) => trade.tradeUuid)

			if (pendingTradeUuids.length > 0) {
				await tradeDB.deleteTrades(bot.prisma, pendingTradeUuids)
			}
		}

		return simpleMessageResponse('Cleared your pending trades.')
	},
} as Subcommand
