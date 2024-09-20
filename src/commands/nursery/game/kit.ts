import { KitGender } from '#cat/gender.js';
import * as pelt from '#cat/pelts.js';
import * as eyes from '#cat/eyes.js';

import * as seasons from './seasons.js';

import type { NurseryKit } from '@prisma/client';
import type { Pelt } from '#cat/pelts.js';
import type { Eyes } from '#cat/eyes.js';
import type { KitEvent } from '#commands/nursery/game/kit-events.js';

import * as config from '#config.js';

enum KitTemperature {
	Heatstroke = 'Heatstroke',
	Burning = 'Burning',
	VeryHot = 'Very Hot',
	Hot = 'Hot',
	Warm = 'Warm',
	Good = 'Good',
	Okay = 'Okay',
	Cool = 'Cool',
	Cold = 'Cold',
	VeryCold = 'Very Cold',
	Freezing = 'Freezing',
	Hypothermia = 'Hypothermia',
}

type Kit = {
	uuid: string;
	position: number;
	index: number;

	prefix: string;
	fullName: string;

	gender: KitGender;
	pelt: Pelt;
	eyes: Eyes;

	events: KitEvent[];

	age: number;
	health: number;
	hunger: number;
	bond: number;
	temperature: number;
	temperatureClass: KitTemperature;

	sickSince?: Date;
	wanderingSince?: Date;

	isDead?: boolean;

	pendingTradeUuid1?: string;
	pendingTradeUuid2?: string;
};

function calculateAgeMoons(kit: NurseryKit) {
	const ageMoons = kit.ageMoons;

	const currentTimestamp = Math.floor(new Date().getTime() / 1000);
	const ageLastUpdatedAt = Math.floor(kit.ageUpdated.getTime() / 1000);
	const secondsSinceLastUpdate = currentTimestamp - ageLastUpdatedAt;

	return ageMoons + secondsSinceLastUpdate * config.NURSERY_KIT_AGE_PER_SECOND;
}

function calculateHunger(kit: NurseryKit) {
	const hunger = kit.hunger;

	const currentTimestamp = Math.floor(new Date().getTime() / 1000);
	const hungerLastUpdatedAt = Math.floor(kit.hungerUpdated.getTime() / 1000);
	const secondsSinceLastUpdate = currentTimestamp - hungerLastUpdatedAt;

	return hunger - secondsSinceLastUpdate * config.NURSERY_KIT_HUNGER_PER_SECOND;
}

function calculateHealth(kit: NurseryKit, hunger: number, temperature: number) {
	let health = kit.health;

	const currentTimestamp = Math.floor(new Date().getTime() / 1000);
	const healthLastUpdatedAt = Math.floor(kit.healthUpdated.getTime() / 1000);
	const secondsSinceLastUpdate = currentTimestamp - healthLastUpdatedAt;

	const regenStartHealth = health;
	let doRegen = true;

	if (kit.sickSince !== null) {
		const secondsSick = currentTimestamp - Math.floor(kit.sickSince.getTime() / 1000);

		health -= secondsSick * config.NURSERY_KIT_HEALTH_DECREASE;
		if (health < 0) health = 0;

		doRegen = false;
	}

	if (hunger <= 0) {
		const secondsHungry = Math.floor(Math.abs(hunger) / config.NURSERY_KIT_HUNGER_PER_SECOND);

		health -= secondsHungry * config.NURSERY_KIT_HEALTH_DECREASE;
		if (health < 0) health = 0;

		doRegen = false;
	}

	if (temperature > config.NURSERY_HEATSTROKE_TEMPERATURE) {
		const degreesPastHeatstroke = Math.abs(config.NURSERY_HEATSTROKE_TEMPERATURE - temperature);

		health -= degreesPastHeatstroke;
		if (health < 0) health = 0;

		doRegen = false;
	}

	if (temperature < config.NURSERY_HYPOTHERMIA_TEMPERATURE) {
		const degreesPastHypothermia = Math.abs(config.NURSERY_HYPOTHERMIA_TEMPERATURE - temperature);

		health -= degreesPastHypothermia;
		if (health < 0) health = 0;

		doRegen = false;
	}

	if (doRegen) {
		const newHealth = regenStartHealth + secondsSinceLastUpdate * config.NURSERY_KIT_HEALTH_REGEN;

		if (newHealth > 1) return 1;
		return health + secondsSinceLastUpdate * config.NURSERY_KIT_HEALTH_REGEN;
	}

	return health;
}

function getTemperatureClass(temperature: number): KitTemperature {
	if (temperature > 38.3) {
		if (temperature > config.NURSERY_HEATSTROKE_TEMPERATURE) {
			return KitTemperature.Heatstroke;
		} else if (temperature > 45) {
			return KitTemperature.Burning;
		} else if (temperature > 43) {
			return KitTemperature.VeryHot;
		} else if (temperature > 41) {
			return KitTemperature.Hot;
		} else if (temperature > 39.6) {
			return KitTemperature.Warm;
		}

		return KitTemperature.Okay;
	} else if (temperature < 37.2) {
		if (temperature < config.NURSERY_HYPOTHERMIA_TEMPERATURE) {
			return KitTemperature.Hypothermia;
		} else if (temperature < 30) {
			return KitTemperature.Freezing;
		} else if (temperature < 32) {
			return KitTemperature.VeryCold;
		} else if (temperature < 34) {
			return KitTemperature.Cold;
		} else if (temperature < 35.8) {
			return KitTemperature.Cool;
		}

		return KitTemperature.Okay;
	} else {
		return KitTemperature.Good;
	}
}

function calculateTemperature(kit: NurseryKit) {
	let temperature = kit.temperature;

	const seasonsSinceUpdate = seasons.getSeasonsBetweenDates(kit.temperatureUpdated, new Date());

	seasonsSinceUpdate.forEach((season) => {
		if (season.season === seasons.Season.Leafbare) {
			temperature -= season.time * config.NURSERY_KIT_TEMPERATURE_PER_SECOND;
		} else if (season.season === seasons.Season.Greenleaf) {
			temperature += season.time * config.NURSERY_KIT_TEMPERATURE_PER_SECOND;
		}
	});

	const temperatureClass = getTemperatureClass(temperature);

	return { temperature, temperatureClass };
}

function calculateBond(kit: NurseryKit) {
	const bond = kit.bond;

	const currentTimestamp = Math.floor(new Date().getTime() / 1000);
	const bondLastUpdatedAt = Math.floor(kit.bondUpdated.getTime() / 1000);
	const secondsSinceLastUpdate = currentTimestamp - bondLastUpdatedAt;

	const newBond = bond + secondsSinceLastUpdate * config.NURSERY_BOND_PER_SECOND;

	if (newBond > 1) return 1;

	return newBond;
}

function getKitDescription(kit: Kit) {
	const kitPelt = pelt.stringifyPelt(kit.pelt);
	const kitEyes = eyes.stringifyEyes(kit.eyes);

	let gender = kit.gender?.toLowerCase() ?? 'kit';
	if (gender === '') gender = 'kit';

	return `${kitPelt} ${gender} with ${kitEyes}`.toLowerCase();
}

function getKit(kit: NurseryKit, index: number, isPaused?: boolean): Kit {
	const age = isPaused ? kit.ageMoons : calculateAgeMoons(kit);
	const hunger = isPaused ? kit.hunger : calculateHunger(kit);
	// prettier-ignore
	const temperature = isPaused ? { temperature: kit.temperature, temperatureClass: getTemperatureClass(kit.temperature) } : calculateTemperature(kit);
	const health = isPaused ? kit.health : calculateHealth(kit, hunger, temperature.temperature);
	const bond = isPaused ? kit.bond : calculateBond(kit);

	const events = (JSON.parse(kit.events) as KitEvent[]).toSorted((a, b) => b.timestamp - a.timestamp);

	return {
		uuid: kit.uuid,
		position: index + 1,
		index,

		prefix: kit.namePrefix,
		fullName: kit.namePrefix + 'kit',

		gender: kit.gender as KitGender,
		pelt: JSON.parse(kit.pelt) as Pelt,
		eyes: JSON.parse(kit.eyes) as Eyes,

		events,

		age,
		health,
		hunger: hunger > 0 ? hunger : 0,
		bond,
		temperature: temperature.temperature,
		temperatureClass: temperature.temperatureClass,

		sickSince: kit.sickSince ?? undefined,
		wanderingSince: kit.wanderingSince ?? undefined,

		isDead: health <= 0 ? true : false,

		pendingTradeUuid1: kit.pendingTradeUuid1 ?? undefined,
		pendingTradeUuid2: kit.pendingTradeUuid2 ?? undefined,
	};
}

export { getKit, getKitDescription, getTemperatureClass };
export type { Kit };
