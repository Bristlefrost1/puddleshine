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

async function findProfileWithDiscordId(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.profile.findFirst({
		where: {
			user: {
				discordId: discordId,
			},
		},
		include: {
			user: true,
		},
	});

	return result;
}

async function initializeProfile(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.profile.create({
		data: {
			user: {
				connectOrCreate: {
					where: {
						discordId: discordId,
					},
					create: createInitialUser(discordId),
				},
			},
		},
	});

	return result;
}

async function setProfileName(prisma: D1PrismaClient, userUuid: string, name: string) {
	const updatedProfile = await prisma.profile.update({
		where: {
			userUuid,
		},
		data: {
			name,
		},
	});

	return updatedProfile;
}

async function setProfileBirthday(prisma: D1PrismaClient, userUuid: string, month: number, day: number) {
	let monthString = month.toString();
	let dayString = day.toString();

	if (monthString.length === 1) monthString = `0${monthString}`;
	if (dayString.length === 1) dayString = `0${dayString}`;

	const birthdayString = `${monthString}-${dayString}`;

	const updatedProfile = await prisma.profile.update({
		where: {
			userUuid,
		},
		data: {
			birthday: birthdayString,
		},
	});

	return updatedProfile;
}

export {
	findUserWithUuid,
	createInitialUser,
	getUserWithDiscordId,
	findProfileWithDiscordId,
	initializeProfile,
	setProfileName,
	setProfileBirthday,
};
export type { D1PrismaClient };
