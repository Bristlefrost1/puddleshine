import * as config from '#config.js';

enum Season {
	Newleaf = 'Newleaf',
	Greenleaf = 'Greenleaf',
	Leaffall = 'Leaf-fall',
	Leafbare = 'Leaf-bare',
}

const SEASON_EPOCH_TIMESTAMP = 1724025600; // Monday, 19 August 2024 00:00:00 UTC

function getSeasonInfo(timestamp: number) {
	const secondsSinceEpoch = timestamp - SEASON_EPOCH_TIMESTAMP;
	const seasonIndex = Math.floor(secondsSinceEpoch / config.NURSERY_SEASON_SECONDS) % Object.values(Season).length;
	const season = Object.values(Season)[seasonIndex];
	const nextSeasonStart =
		SEASON_EPOCH_TIMESTAMP +
		(Math.floor(secondsSinceEpoch / config.NURSERY_SEASON_SECONDS) + 1) * config.NURSERY_SEASON_SECONDS;

	return { season, nextSeasonStart };
}

function getSeasonOnDate(date: Date): Season {
	const dateTimestamp = Math.floor(date.getTime() / 1000);

	const secondsSinceEpoch = dateTimestamp - SEASON_EPOCH_TIMESTAMP;
	const seasonsSinceEpoch = Math.floor(secondsSinceEpoch / config.NURSERY_SEASON_SECONDS);

	const seasonValues = Object.values(Season);

	return seasonValues[seasonsSinceEpoch % seasonValues.length];
}

function getNextSeasonOnDate(date: Date) {
	const dateTimestamp = Math.floor(date.getTime() / 1000);

	const secondsSinceEpoch = dateTimestamp - SEASON_EPOCH_TIMESTAMP;
	const seasonsSinceEpoch = Math.floor(secondsSinceEpoch / config.NURSERY_SEASON_SECONDS);

	const seasonValues = Object.values(Season);

	const nextSeason = seasonsSinceEpoch + 1;
	const nextSeasonStartsAt = new Date((SEASON_EPOCH_TIMESTAMP + nextSeason * config.NURSERY_SEASON_SECONDS) * 1000);

	return {
		nextSeason: seasonValues[nextSeason % seasonValues.length],
		nextSeasonStartsAt,
	};
}

function getSeasonsBetweenDates(date1: Date, date2: Date): { season: Season; time: number }[] {
	const date1Timestamp = Math.floor(date1.getTime() / 1000);
	const date2Timestamp = Math.floor(date2.getTime() / 1000);

	const date1SecondsSinceEpoch = date1Timestamp - SEASON_EPOCH_TIMESTAMP;
	const date2SecondsSinceEpoch = date2Timestamp - SEASON_EPOCH_TIMESTAMP;

	const date1SeasonsSinceEpoch = Math.floor(date1SecondsSinceEpoch / config.NURSERY_SEASON_SECONDS);
	const date2SeasonsSinceEpoch = Math.floor(date2SecondsSinceEpoch / config.NURSERY_SEASON_SECONDS);

	const seasonValues = Object.values(Season);

	if (date1SeasonsSinceEpoch === date2SeasonsSinceEpoch) {
		return [
			{
				season: seasonValues[date1SeasonsSinceEpoch % seasonValues.length],
				time: Math.abs(date2SecondsSinceEpoch - date1SecondsSinceEpoch),
			},
		];
	} else {
		const seasons: { season: Season; time: number }[] = [];
		let timestamp = date1Timestamp;

		while (timestamp < date2Timestamp) {
			const { season, nextSeasonStart } = getSeasonInfo(timestamp);

			const endOfCurrentSeason = Math.min(nextSeasonStart, date2Timestamp);
			const timeInCurrentSeason = endOfCurrentSeason - timestamp;

			seasons.push({ season, time: timeInCurrentSeason });

			timestamp = endOfCurrentSeason;
		}

		return seasons;
	}
}

function getCurrentSeason() {
	const currentDate = new Date();

	return getSeasonOnDate(currentDate);
}

function getNextSeason() {
	const currentDate = new Date();

	return getNextSeasonOnDate(currentDate);
}

export { Season, getSeasonOnDate, getNextSeasonOnDate, getSeasonsBetweenDates, getCurrentSeason, getNextSeason };
