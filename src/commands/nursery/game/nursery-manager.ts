import * as DAPI from 'discord-api-types/v10';

import * as db from '#db/database.js';
import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import { getKit, type Kit } from '#commands/nursery/game/kit.js';

import * as config from '#config.js';

import type { Nursery as DBNursery, NurseryKit } from '@prisma/client';

type NurseryAlert = {};

type Nursery = {
	uuid: string;
	displayName: string;

	lastBredAt?: Date;

	food: { food: number; max: number; foodPoints: number; nextFoodPointPercentage: number | undefined };

	alerts: NurseryAlert[];

	kits: Kit[];
};

function getNurseryMetersMax() {
	// TODO: Difficulty setting
	return { food: 5 };
}

function calculateFood(nursery: DBNursery) {
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

function getFood(nursery: DBNursery) {
	const food = calculateFood(nursery);
	const foodString = food.toString().split('.');

	const foodPoints = Number.parseInt(foodString[0]);

	if (foodString.length === 2) {
		const nextFoodPointPercentage = Number.parseFloat(`0.${foodString[1]}`) * 100;

		return { food, foodPoints, nextFoodPointPercentage };
	} else {
		return { food, foodPoints };
	}
}

async function getNursery(user: DAPI.APIUser, env: Env): Promise<Nursery> {
	const discordId = user.id;

	const profile = await db.findProfileWithDiscordId(env.PRISMA, discordId);
	const nursery = await nurseryDB.getNursery(env.PRISMA, discordId);
	const kits = await nurseryDB.findKits(env.PRISMA, nursery.uuid);

	kits.sort((a, b) => {
		let compareA: Date;
		let compareB: Date;

		if (a.adoptedAt === null) {
			compareA = a.bredAt;
		} else if (a.adoptedAt.getTime() > a.bredAt.getTime()) {
			compareA = a.adoptedAt;
		} else {
			compareA = a.bredAt;
		}

		if (b.adoptedAt === null) {
			compareB = b.bredAt;
		} else if (b.adoptedAt.getTime() > b.bredAt.getTime()) {
			compareB = b.adoptedAt;
		} else {
			compareB = b.bredAt;
		}

		return compareA.getTime() - compareB.getTime();
	});

	let displayName = user.username;
	if (profile && profile.name) displayName = profile.name;

	const food = getFood(nursery);

	const nurseryKits: Kit[] = [];

	for (let i = 0; i < kits.length; i++) {
		nurseryKits.push(getKit(kits[i], i));
	}

	return {
		uuid: nursery.uuid,
		displayName,

		lastBredAt: nursery.lastBredAt ?? undefined,

		food: {
			food: food.food,
			max: getNurseryMetersMax().food,
			foodPoints: food.foodPoints,
			nextFoodPointPercentage: food.nextFoodPointPercentage,
		},

		alerts: [],

		kits: nurseryKits,
	};
}

function locateKits(nursery: Nursery, kitsToLocate: string[]) {
	const foundKits: Kit[] = [];

	if (nursery.kits.length === 0 || kitsToLocate.length === 0) return [];

	if (kitsToLocate[0].toLowerCase() === 'all') {
		foundKits.push(...nursery.kits);

		return foundKits;
	}

	for (const kit of kitsToLocate) {
		const kitPosition = Number.parseInt(kit);

		if (!isNaN(kitPosition)) {
			if (nursery.kits[kitPosition - 1]) foundKits.push(nursery.kits[kitPosition - 1]);
		} else {
			const lowercaseName = kit.toLowerCase();

			const filterResult = nursery.kits.filter(
				(nurseryKit) =>
					nurseryKit.prefix.toLowerCase() === lowercaseName ||
					nurseryKit.fullName.toLowerCase() === lowercaseName,
			);

			if (filterResult.length > 0) foundKits.push(...filterResult);
		}
	}

	return foundKits;
}

export { getNursery, locateKits };
export type { Nursery };
