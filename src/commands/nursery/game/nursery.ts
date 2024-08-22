import * as config from '#config.js';

import type { Nursery } from '@prisma/client';

function getNurseryMetersMax() {
	// TODO: Difficulty setting
	return { food: 5, energy: 60 };
}

function calculateFood(nursery: Nursery) {
	const foodAtLastUpdate = nursery.food;
	const lastUpdated = nursery.foodUpdated;
	const currentDate = new Date();

	const max = getNurseryMetersMax();

	if (foodAtLastUpdate >= max.food) return max.food;

	const lastUpdatedTimestamp = Math.floor(lastUpdated.getTime() / 1000);
	const currentTimestamp = Math.floor(currentDate.getTime() / 1000);

	const updatedSecondsAgo = currentTimestamp - lastUpdatedTimestamp;

	const regenerated = foodAtLastUpdate + updatedSecondsAgo * (1 / config.NURSERY_REGENERATE_FOOD_POINT);

	if (regenerated >= max.food) return max.food;

	return regenerated;
}

function getFood(nursery: Nursery) {
	const food = calculateFood(nursery);
	const foodString = food.toString().split('.');

	const foodPoints = Number.parseInt(foodString[0]);

	if (foodString.length === 2) {
		const nextFoodPointPercentage = Number.parseFloat(`0.${foodString[1]}`) * 100;

		return { foodPoints, nextFoodPointPercentage };
	} else {
		return { foodPoints };
	}
}

export { calculateFood, getFood };
