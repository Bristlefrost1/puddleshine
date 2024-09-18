import * as catchaDB from '#commands/catcha/db/catcha-db.js';

import * as config from '#config.js';

type Catcha = NonNullable<Awaited<ReturnType<typeof catchaDB.findCatcha>>>;

function getTradeCooldown(catcha: Catcha, currentUnixTime: number) {
	let isOnCooldown = false;
	let canTradeAtUnixTime: number | undefined;

	if (config.CATCHA_TRADE_COOLDOWN > 0 && catcha.lastTradedAt !== null) {
		const lastTradedAtUnixTime = Math.floor(catcha.lastTradedAt.getTime() / 1000);
		const canTradeAt = lastTradedAtUnixTime + config.CATCHA_TRADE_COOLDOWN;

		if (canTradeAt > currentUnixTime) {
			isOnCooldown = true;
			canTradeAtUnixTime = canTradeAt;
		}
	}

	return { isOnCooldown, canTradeAtUnixTime };
}

export { getTradeCooldown };
