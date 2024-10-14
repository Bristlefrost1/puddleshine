import * as config from '#config.js';

enum Season {
	Newleaf = 'Newleaf',
	Greenleaf = 'Greenleaf',
	Leaffall = 'Leaf-fall',
	Leafbare = 'Leaf-bare',
}

const SEASON_EPOCH_TIMESTAMP = 1724025600; // Monday, 19 August 2024 00:00:00 UTC

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
		const seasons = [];
		const numberOfSeasons = Math.abs(date2SeasonsSinceEpoch - date1SeasonsSinceEpoch);

		for (let i = 0; i < numberOfSeasons; i++) {
			const seasonNumber = date1SeasonsSinceEpoch + i;

			let startTimestamp: number;
			let endTimestamp: number;

			if (seasonNumber === date1SeasonsSinceEpoch) {
				startTimestamp = date1Timestamp;
				endTimestamp = Math.floor(getNextSeasonOnDate(date1).nextSeasonStartsAt.getTime() / 1000);
			} else if (seasonNumber === date2SeasonsSinceEpoch) {
				startTimestamp = SEASON_EPOCH_TIMESTAMP + seasonNumber * config.NURSERY_SEASON_SECONDS;
				endTimestamp = date2Timestamp;
			} else {
				startTimestamp = SEASON_EPOCH_TIMESTAMP + seasonNumber * config.NURSERY_SEASON_SECONDS;
				endTimestamp = SEASON_EPOCH_TIMESTAMP + (seasonNumber + 1) * config.NURSERY_SEASON_SECONDS;
			}

			seasons.push({
				season: seasonValues[seasonNumber % seasonValues.length],
				time: Math.abs(endTimestamp - startTimestamp),
			});
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
