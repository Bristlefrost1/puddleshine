import * as DAPI from 'discord-api-types/v10'
import { parseCronExpression } from 'cron-schedule'

import * as catchaDB from '@/db/catcha-db'
import * as rollPeriod from '@/commands/catcha/rolling/roll-period'
import { getCurrentEvent } from '@/commands/catcha/event'
import { hasRecentlyClaimed } from '@/commands/catcha/rolling/roll-utils'
import { embedMessageResponse } from '@/discord/responses'
import { bot } from '@/bot'
import { type Subcommand } from '@/commands'

import * as config from '@/config'

export default {
	name: 'event',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'event',
		description: 'See details about the currently ongoing event and check your cooldowns.',
	},

	async onApplicationCommand({ interaction, user, options }) {
		const currentDate = new Date()

		const userCatcha = await catchaDB.findCatcha(bot.prisma, user.id)

		const currentRollPeriod = rollPeriod.getCurrentRollPeriod()
		const nextRollPeriod = currentRollPeriod + 1
		const nextRollPeriodTimestamp = nextRollPeriod * 60 * 60 + rollPeriod.ROLL_PERIOD_EPOCH

		const currentEvent = await getCurrentEvent()
		const nextEventStarts = parseCronExpression(config.WEEKLY_CRON).getNextDate(currentDate)
		const nextEventStartsTimestamp = Math.floor(nextEventStarts.getTime() / 1000)

		const descriptionLines: string[] = []

		descriptionLines.push(currentEvent !== undefined ? currentEvent.eventText : '*No event is currently ongoing.*')
		descriptionLines.push('\n')
		descriptionLines.push(
			`The next event starts: <t:${nextEventStartsTimestamp}:F> (<t:${nextEventStartsTimestamp}:R>)`,
		)
		descriptionLines.push(`The next roll period starts: <t:${nextRollPeriodTimestamp}:R>`)

		if (userCatcha) {
			const { hasClaimedRecently, claimCooldownEnd } = hasRecentlyClaimed(userCatcha, currentRollPeriod)

			if (hasClaimedRecently) {
				descriptionLines.push(`Your rolling cooldown ends <t:${claimCooldownEnd}:R>.`)
			} else {
				let remainingRolls: number

				if (userCatcha.lastRollPeriod === currentRollPeriod && userCatcha.lastRollCount) {
					remainingRolls = config.CATCHA_MAX_ROLLS - userCatcha.lastRollCount
				} else {
					remainingRolls = config.CATCHA_MAX_ROLLS
				}

				descriptionLines.push(`You have ${remainingRolls} rolls left in this roll period.`)
			}

			/*
			if (config.CATCHA_TRADE_COOLDOWN > 0) {
				const cooldown = getTradeCooldown(userCatcha, Math.floor(currentDate.getTime() / 1000));

				if (cooldown.isOnCooldown) {
					descriptionLines.push(`Your next trade is available <t:${cooldown.canTradeAtUnixTime}:R>.`);
				} else {
					descriptionLines.push('You have an available trade.');
				}
			} else {
				descriptionLines.push('There is currently no trade cooldown.');
			}
			*/
		}

		return embedMessageResponse({
			title: 'Catcha Schedule',
			description: descriptionLines.join('\n'),
			timestamp: currentDate.toISOString(),
		})
	},
} as Subcommand
