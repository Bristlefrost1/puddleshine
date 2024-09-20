import * as DAPI from 'discord-api-types/v10';
import { parseCronExpression } from 'cron-schedule';

import { embedMessageResponse } from '#discord/responses.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import * as rollPeriod from '#commands/catcha/roll/roll-period.js';
import { getCurrentEvent } from './event.js';
import { getTradeCooldown } from '#commands/trade/restrictions/cooldown.js';
import { hasRecentlyClaimed } from '#commands/catcha/roll/roll.js';

import * as config from '#config.js';

async function handleEventSubcommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined,
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const currentDate = new Date();

	const userCatcha = await catchaDB.findCatcha(env.PRISMA, user.id);

	const currentRollPeriod = rollPeriod.getCurrentRollPeriod();
	const nextRollPeriod = currentRollPeriod + 1;
	const nextRollPeriodTimestamp = nextRollPeriod * 60 * 60 + rollPeriod.ROLL_PERIOD_EPOCH;

	const currentEvent = await getCurrentEvent(env);
	const nextEventStarts = parseCronExpression(config.WEEKLY_CRON).getNextDate(currentDate);
	const nextEventStartsTimestamp = Math.floor(nextEventStarts.getTime() / 1000);

	const descriptionLines: string[] = [];

	descriptionLines.push(currentEvent !== undefined ? currentEvent.eventText : '*No event is currently ongoing.*');
	descriptionLines.push('\n');
	descriptionLines.push(
		`The next event starts: <t:${nextEventStartsTimestamp}:F> (<t:${nextEventStartsTimestamp}:R>)`,
	);
	descriptionLines.push(`The next roll period starts: <t:${nextRollPeriodTimestamp}:R>`);

	if (userCatcha) {
		const { hasClaimedRecently, claimCooldownEnd } = hasRecentlyClaimed(userCatcha, currentRollPeriod);

		if (hasClaimedRecently) {
			descriptionLines.push(`Your rolling cooldown ends <t:${claimCooldownEnd}:R>.`);
		} else {
			let remainingRolls: number;

			if (userCatcha.lastRollPeriod === currentRollPeriod && userCatcha.lastRollCount) {
				remainingRolls = config.CATCHA_MAX_ROLLS - userCatcha.lastRollCount;
			} else {
				remainingRolls = config.CATCHA_MAX_ROLLS;
			}

			descriptionLines.push(`You have ${remainingRolls} rolls left in this roll period.`);
		}

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
	}

	return embedMessageResponse({
		title: 'Catcha Schedule',
		description: descriptionLines.join('\n'),
		timestamp: currentDate.toISOString(),
	});
}

export { handleEventSubcommand };
