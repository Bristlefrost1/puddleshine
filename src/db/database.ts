import { PuddleshineBot } from '@/bot'

export type D1PrismaClient = InstanceType<typeof PuddleshineBot>['prisma']

export function createInitialUser(discordId: string) {
	return {
		uuid: crypto.randomUUID(),
		discordId: discordId,
		createdAt: new Date().toISOString(),
	}
}

export async function findUserWithUuid(prisma: D1PrismaClient, uuid: string) {
	const result = await prisma.user.findUnique({
		where: {
			uuid: uuid,
		},
	})

	return result
}

export async function getUserWithDiscordId(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.user.findUnique({
		where: {
			discordId: discordId,
		},
	})

	return result
}

export async function findProfileWithDiscordId(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.profile.findFirst({
		where: {
			user: {
				discordId: discordId,
			},
		},
		include: {
			user: true,
		},
	})

	return result
}

export async function initializeProfile(prisma: D1PrismaClient, discordId: string) {
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
	})

	return result
}

export async function setProfileName(prisma: D1PrismaClient, userUuid: string, name: string) {
	const updatedProfile = await prisma.profile.update({
		where: {
			userUuid,
		},
		data: {
			name,
		},
	})

	return updatedProfile
}

export async function setProfileBirthday(prisma: D1PrismaClient, userUuid: string, month: number, day: number) {
	let monthString = month.toString()
	let dayString = day.toString()

	if (monthString.length === 1) monthString = `0${monthString}`
	if (dayString.length === 1) dayString = `0${dayString}`

	const birthdayString = `${monthString}-${dayString}`

	const updatedProfile = await prisma.profile.update({
		where: {
			userUuid,
		},
		data: {
			birthday: birthdayString,
		},
	})

	return updatedProfile
}
