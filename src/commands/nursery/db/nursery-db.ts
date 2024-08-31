import * as database from '#db/database.js';

import { KitGender } from '#cat/gender.js';
import { NurseryDifficulty } from '#commands/nursery/game/difficulty.js';
import { Kit } from '#commands/nursery/game/kit.js';
import { ClanRank } from '#utils/clans.js';

import type { D1PrismaClient } from '#/db/database.js';
import type { Pelt } from '#cat/pelts.js';
import type { Eyes } from '#cat/eyes.js';

import * as config from '#config.js';
import { Nursery } from '../game/nursery-manager.js';

async function findNursery(prisma: D1PrismaClient, discordId: string) {
	return await prisma.nursery.findFirst({
		where: {
			user: {
				discordId,
			},
		},
		include: {
			user: true,
		},
	});
}

async function initializeNurseryForUser(prisma: D1PrismaClient, discordId: string) {
	const creationTime = new Date();

	return await prisma.nursery.create({
		data: {
			difficulty: NurseryDifficulty.Normal, // Normal is the default
			isPaused: false,

			food: 5,
			foodUpdated: creationTime,

			alerts: JSON.stringify([]),

			lastAdoptedAt: null,
			lastBredAt: null,
			lastCooledAt: null,

			user: {
				connectOrCreate: {
					where: {
						discordId: discordId,
					},
					create: database.createInitialUser(discordId),
				},
			},
		},
		include: {
			user: true,
		},
	});
}

async function getNursery(prisma: D1PrismaClient, discordId: string) {
	const existingNursery = await findNursery(prisma, discordId);

	if (existingNursery) return existingNursery;

	return await initializeNurseryForUser(prisma, discordId);
}

async function updateFood(prisma: D1PrismaClient, userUuid: string, food: number) {
	const updatedAt = new Date();

	return await prisma.nursery.update({
		where: {
			uuid: userUuid,
		},
		data: {
			food,
			foodUpdated: updatedAt,
		},
	});
}

async function findKits(prisma: D1PrismaClient, nurseryUuid: string) {
	return await prisma.nurseryKit.findMany({
		where: {
			nurseryUuid,
		},
	});
}

async function breedForKits(
	prisma: D1PrismaClient,
	nurseryUuid: string,

	breedTime: Date,

	bredKits: {
		prefix: string;
		gender: KitGender;
		pelt: Pelt;
		eyes: Eyes;
	}[],
) {
	let i = 0;

	return await prisma.$transaction([
		prisma.nursery.update({
			where: {
				uuid: nurseryUuid,
			},
			data: {
				lastBredAt: breedTime,
			},
		}),
		prisma.nurseryKit.createMany({
			data: bredKits.map((kit) => {
				const kitBreedTime = new Date(breedTime.getTime() + i);

				i++;

				return {
					namePrefix: kit.prefix,
					gender: kit.gender,

					ageMoons: 0,
					ageUpdated: kitBreedTime,

					bredAt: kitBreedTime,
					bredBy: nurseryUuid,

					pelt: JSON.stringify(kit.pelt),
					eyes: JSON.stringify(kit.eyes),

					health: 1,
					healthUpdated: kitBreedTime,
					hunger: 1,
					hungerUpdated: kitBreedTime,
					bond: 0.5,
					bondUpdated: kitBreedTime,
					temperature: 38,
					temperatureUpdated: kitBreedTime,

					events: JSON.stringify([]),

					nurseryUuid,
				};
			}),
		}),
	]);
}

async function feedKits(
	prisma: D1PrismaClient,
	nurseryUuid: string,
	feedTime: Date,
	newFood: number,
	updateKits: { uuid: string; hunger: number; events: string }[],
) {
	return await prisma.$transaction([
		prisma.nursery.update({
			where: {
				uuid: nurseryUuid,
			},
			data: {
				food: newFood,
				foodUpdated: feedTime,
			},
		}),
		...updateKits.map((kitUpdate) => {
			return prisma.nurseryKit.update({
				where: {
					uuid: kitUpdate.uuid,
				},
				data: {
					events: kitUpdate.events,

					hunger: kitUpdate.hunger,
					hungerUpdated: feedTime,
				},
			});
		}),
	]);
}

async function promoteKit(
	prisma: D1PrismaClient,
	userUuid: string,
	kit: Kit,
	options: {
		clan: string;
		apprenticeRank: ClanRank.WarriorApprentice | ClanRank.MedicineCatApprentice;
	},
) {
	const timeOfStorage = new Date();

	return await prisma.$transaction([
		prisma.historyCat.create({
			data: {
				namePrefix: kit.prefix,
				nameSuffix: 'paw',

				pelt: JSON.stringify(kit.pelt),
				eyes: JSON.stringify(kit.eyes),

				clan: options.clan,
				rank: options.apprenticeRank,

				isDead: false,

				dateStored: timeOfStorage,
				ageStored: kit.age,

				user: {
					connect: {
						uuid: userUuid,
					},
				},
			},
		}),
		prisma.nurseryKit.delete({
			where: {
				uuid: kit.uuid,
			},
		}),
		prisma.nursery.update({
			where: {
				uuid: userUuid,
			},
			data: {
				statsRaised: {
					increment: 1,
				},
			},
		}),
	]);
}

async function coolNursery(
	prisma: D1PrismaClient,
	userUuid: string,
	kitsToCool: { uuid: string; newTemperature: number }[],
) {
	const coolTime = new Date();

	return await prisma.$transaction([
		prisma.nursery.update({
			where: {
				uuid: userUuid,
			},
			data: {
				lastCooledAt: coolTime,
			},
		}),
		...kitsToCool.map((kit) => {
			return prisma.nurseryKit.update({
				where: {
					uuid: kit.uuid,
				},
				data: {
					temperature: kit.newTemperature,
					temperatureUpdated: coolTime,
				},
			});
		}),
	]);
}

async function updateKitTemperatures(
	prisma: D1PrismaClient,
	kits: { uuid: string; newTemperature: number; events?: string }[],
	updateTime: Date,
) {
	return await prisma.$transaction([
		...kits.map((kit) => {
			return prisma.nurseryKit.update({
				where: {
					uuid: kit.uuid,
				},
				data: {
					temperature: kit.newTemperature,
					temperatureUpdated: updateTime,
					events: kit.events,
				},
			});
		}),
	]);
}

async function updateNurseryAlerts(prisma: D1PrismaClient, uuid: string, alerts: string) {
	return await prisma.nursery.update({
		where: {
			uuid,
		},
		data: { alerts },
	});
}

async function kitsDied(prisma: D1PrismaClient, userUuid: string, clan: string, kits: Kit[], alerts: string) {
	const timeOfStorage = new Date();

	return await prisma.$transaction([
		prisma.historyCat.createMany({
			data: kits.map((kit) => {
				return {
					userUuid,

					namePrefix: kit.prefix,
					nameSuffix: 'kit',

					pelt: JSON.stringify(kit.pelt),
					eyes: JSON.stringify(kit.eyes),

					clan: clan,
					rank: ClanRank.Kit,

					isDead: true,
					diedAtMoons: kit.age,

					dateStored: timeOfStorage,
					ageStored: kit.age,
				};
			}),
		}),
		prisma.nurseryKit.deleteMany({
			where: {
				OR: kits.map((kit) => {
					return { uuid: kit.uuid };
				}),
			},
		}),
		prisma.nursery.update({
			where: {
				uuid: userUuid,
			},
			data: {
				alerts,
				statsKilled: {
					increment: kits.length,
				},
			},
		}),
	]);
}

async function pauseNursery(prisma: D1PrismaClient, nursery: Nursery, kits: Kit[]) {
	const pauseTime = new Date();

	return await prisma.$transaction([
		...kits.map((kit) => {
			return prisma.nurseryKit.update({
				where: {
					uuid: kit.uuid,
				},
				data: {
					ageMoons: kit.age,
					ageUpdated: pauseTime,

					health: kit.health,
					healthUpdated: pauseTime,

					hunger: kit.hunger,
					hungerUpdated: pauseTime,

					bond: kit.bond,
					bondUpdated: pauseTime,

					temperature: kit.temperature,
					temperatureUpdated: pauseTime,
				},
			});
		}),
		prisma.nursery.update({
			where: {
				uuid: nursery.uuid,
			},
			data: {
				food: nursery.food.food,
				foodUpdated: pauseTime,
				isPaused: true,
			},
		}),
	]);
}

async function unpauseNursery(prisma: D1PrismaClient, nursery: Nursery, kits: Kit[]) {
	const unpauseTime = new Date();

	return await prisma.$transaction([
		...kits.map((kit) => {
			return prisma.nurseryKit.update({
				where: {
					uuid: kit.uuid,
				},
				data: {
					ageUpdated: unpauseTime,
					healthUpdated: unpauseTime,
					hungerUpdated: unpauseTime,
					bondUpdated: unpauseTime,
					temperatureUpdated: unpauseTime,

					sickSince: kit.sickSince !== undefined ? unpauseTime : null,
					wanderingSince: kit.wanderingSince !== undefined ? unpauseTime : null,
				},
			});
		}),
		prisma.nursery.update({
			where: {
				uuid: nursery.uuid,
			},
			data: {
				foodUpdated: unpauseTime,
				isPaused: false,
			},
		}),
	]);
}

export {
	findNursery,
	initializeNurseryForUser,
	getNursery,
	updateFood,
	findKits,
	breedForKits,
	feedKits,
	promoteKit,
	coolNursery,
	updateKitTemperatures,
	updateNurseryAlerts,
	kitsDied,
	pauseNursery,
	unpauseNursery,
};
