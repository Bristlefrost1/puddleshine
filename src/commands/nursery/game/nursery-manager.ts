import * as DAPI from 'discord-api-types/v10';

import * as db from '#db/database.js';
import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import { getKit, type Kit } from '#commands/nursery/game/kit.js';
import { Season, getCurrentSeason } from './seasons.js';
import {
	addNewAlertToAlerts,
	addNewAlertToNursery,
	findPromotionAlert,
	NurseryAlert,
	NurseryAlertType,
} from './nursery-alerts.js';

import * as config from '#config.js';

import type { Nursery as DBNursery, NurseryKit } from '@prisma/client';

type Nursery = {
	uuid: string;
	displayName: string;
	isPaused: boolean;
	clan?: string;
	season: Season;

	lastBredAt?: Date;
	lastCooledAt?: Date;

	food: { food: number; max: number; foodPoints: number; nextFoodPointPercentage: number | undefined };

	alerts: NurseryAlert[];

	kits: Kit[];
	kitsNeedingAttention: Kit[];
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

function getFood(nursery: DBNursery, isPaused: boolean) {
	const food = isPaused ? nursery.food : calculateFood(nursery);
	const foodString = food.toString().split('.');

	const foodPoints = Number.parseInt(foodString[0]);

	if (foodString.length === 2) {
		const nextFoodPointPercentage = Number.parseFloat(`0.${foodString[1]}`) * 100;

		return { food, foodPoints, nextFoodPointPercentage };
	} else {
		return { food, foodPoints };
	}
}

async function getNursery(user: DAPI.APIUser, env: Env, generateEvents?: boolean): Promise<Nursery> {
	const discordId = user.id;

	const profile = await db.findProfileWithDiscordId(env.PRISMA, discordId);
	const nursery = await nurseryDB.getNursery(env.PRISMA, discordId);
	const nurseryKits = await nurseryDB.findKits(env.PRISMA, nursery.uuid);

	nurseryKits.sort((a, b) => {
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

	const food = getFood(nursery, nursery.isPaused);
	const alerts = (JSON.parse(nursery.alerts) as NurseryAlert[]).toSorted((a, b) => b.timestamp - a.timestamp);
	let updateAlerts = false;

	const kits: Kit[] = [];
	const kitsNeedingAttention: Kit[] = [];
	const deadKits: Kit[] = [];

	let kitIndex = 0;

	for (const nurseryKit of nurseryKits) {
		const kit = getKit(nurseryKit, kitIndex, nursery.isPaused);

		if (kit.isDead && env.ENV !== 'dev') {
			addNewAlertToAlerts(alerts, NurseryAlertType.KitDied, `${kit.fullName} has died.`);
			deadKits.push(kit);
		} else {
			let needsAttention = false;

			if (kit.age >= config.NURSERY_PROMOTE_AGE) {
				needsAttention = true;

				if (!findPromotionAlert(alerts, kit.uuid)) {
					addNewAlertToAlerts(
						alerts,
						NurseryAlertType.Promote,
						`${kit.fullName} wants to become an apprentice.`,
						undefined,
						kit.uuid,
					);

					updateAlerts = true;
				}
			}

			if (kit.sickSince !== undefined) needsAttention = true;

			kits.push(kit);
			if (needsAttention) kitsNeedingAttention.push(kit);

			kitIndex++;
		}
	}

	if (deadKits.length >= 1) {
		await nurseryDB.kitsDied(env.PRISMA, nursery.uuid, profile?.group ?? '', deadKits, JSON.stringify(alerts));
	}

	if (updateAlerts) {
		await nurseryDB.updateNurseryAlerts(env.PRISMA, nursery.uuid, JSON.stringify(alerts));
	}

	return {
		uuid: nursery.uuid,
		displayName,
		isPaused: nursery.isPaused,
		clan: profile?.group ?? undefined,
		season: getCurrentSeason(),

		lastBredAt: nursery.lastBredAt ?? undefined,
		lastCooledAt: nursery.lastCooledAt ?? undefined,

		food: {
			food: food.food,
			max: getNurseryMetersMax().food,
			foodPoints: food.foodPoints,
			nextFoodPointPercentage: food.nextFoodPointPercentage,
		},

		alerts: alerts,

		kits: kits,
		kitsNeedingAttention,
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
