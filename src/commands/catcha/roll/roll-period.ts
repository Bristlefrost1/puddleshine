/**
 * The roll period epoch - 1 May 2024 00:00:00 UTC
 */
const ROLL_PERIOD_EPOCH = 1714521600;

function getRollPeriodFromUnixTime(timestamp: number) {
	const secondsSinceEpoch = timestamp - ROLL_PERIOD_EPOCH;
	const rollPeriod = Math.floor(secondsSinceEpoch / 60 / 60); // Hours since epoch

	return rollPeriod;
}

function getCurrentRollPeriod() {
	const unixTimestamp = Math.floor(new Date().getTime() / 1000);
	return getRollPeriodFromUnixTime(unixTimestamp);
}

export { ROLL_PERIOD_EPOCH, getRollPeriodFromUnixTime, getCurrentRollPeriod };
