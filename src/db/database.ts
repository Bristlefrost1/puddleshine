import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

type D1PrismaClient = PrismaClient<{ adapter: PrismaD1 }>;

function createInitialUser(discordId: string) {
	return {
		uuid: crypto.randomUUID(),
		discordId: discordId,
		createdAt: new Date().toISOString(),
	};
}

async function findUserWithUuid(prisma: D1PrismaClient, uuid: string) {
	const result = await prisma.user.findUnique({
		where: {
			uuid: uuid,
		},
	});

	return result;
}

async function getUserWithDiscordId(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.user.findUnique({
		where: {
			discordId: discordId,
		},
	});

	return result;
}

export { findUserWithUuid, createInitialUser, getUserWithDiscordId };
export type { D1PrismaClient };
