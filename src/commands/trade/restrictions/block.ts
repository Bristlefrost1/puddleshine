import * as catchaDB from '#commands/catcha/db/catcha-db.js';

type Catcha = NonNullable<Awaited<ReturnType<typeof catchaDB.findCatcha>>>;

/**
 * Determines whether a Catcha is blocked from trading.
 *
 * @param catcha The Catcha to check.
 * @param currentTimeMs The current time in milliseconds since 1 January 1970.
 * @returns Information about the trade block if currently active.
 */
function getCurrentlyTradeBlocked(catcha: Catcha, currentTimeMs: number) {
	let currentlyBlocked: boolean | undefined;
	let blockedUntil: Date | undefined;
	let blockedUntilUnixTime: number | undefined;
	let reason: string | undefined;

	if (catcha.tradeBlocked) {
		if (catcha.tradeBlockedUntil === null) {
			currentlyBlocked = true; // Blocked indefinitely

			if (catcha.tradeBlockedReason) reason = catcha.tradeBlockedReason;
		} else {
			const tradeBlockedUntilMs = catcha.tradeBlockedUntil.getTime();

			if (tradeBlockedUntilMs > currentTimeMs) {
				currentlyBlocked = true;
				blockedUntil = catcha.tradeBlockedUntil;
				blockedUntilUnixTime = Math.floor(tradeBlockedUntilMs / 1000);

				if (catcha.tradeBlockedReason) reason = catcha.tradeBlockedReason;
			}
		}
	}

	return { currentlyBlocked, blockedUntil, blockedUntilUnixTime, reason };
}

export { getCurrentlyTradeBlocked };
