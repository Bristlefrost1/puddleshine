import * as database from '#db/database.js';

import { KitGender } from '#cat/gender.js';

import { NurseryDifficulty } from '#commands/nursery/game/difficulty.js';

import type { D1PrismaClient } from '#/db/database.js';
import type { Pelt } from '#cat/pelts.js';
import type { Eyes } from '#cat/eyes.js';

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

	bredKits: {
		prefix: string;
		gender: KitGender;
		pelt: Pelt;
		eyes: Eyes;
	}[],
) {
	const breedTime = new Date();

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
				return {
					namePrefix: kit.prefix,
					gender: kit.gender,

					ageMoons: 0,
					ageUpdated: breedTime,

					bredAt: breedTime,
					bredBy: nurseryUuid,

					pelt: JSON.stringify(kit.pelt),
					eyes: JSON.stringify(kit.eyes),

					health: 1,
					healthUpdated: breedTime,
					hunger: 1,
					hungerUpdated: breedTime,
					bond: 0.5,
					bondUpdated: breedTime,
					temperature: 38,
					temperatureUpdated: breedTime,

					events: JSON.stringify([]),

					nurseryUuid,
				};
			}),
		}),
	]);
}

export { findNursery, initializeNurseryForUser, getNursery, updateFood, findKits, breedForKits };
