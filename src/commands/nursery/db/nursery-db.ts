import * as database from '#db/database.js';

import { NurseryDifficulty } from '#commands/nursery/game/difficulty.js';

import type { D1PrismaClient } from '#/db/database.js';

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

async function findKits(prisma: D1PrismaClient, nurseryUuid: string) {
	return await prisma.nurseryKit.findMany({
		where: {
			nurseryUuid,
		},
	});
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

export { findNursery, initializeNurseryForUser, getNursery, findKits, updateFood };
