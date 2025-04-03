import { type D1PrismaClient } from '@/db/database'

export async function findArtistProfile(name: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.findUnique({
		where: {
			name: name.toLowerCase(),
		},
	})
}

export async function findArtistProfileWithDiscordId(discordId: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.findFirst({
		where: {
			discordId,
		},
	})
}

export async function initializeArtistProfile(name: string, discordId: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.create({
		data: {
			name: name.toLowerCase(),
			discordId,
		},
	})
}

export async function linkArtistProfile(name: string, discordId: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.update({
		where: {
			name: name.toLowerCase(),
		},
		data: {
			discordId,
		},
	})
}

export async function renameArtist(name: string, newName: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.update({
		where: {
			name: name.toLowerCase(),
		},
		data: {
			name: newName,
		},
	})
}

export async function updateDisplayName(name: string, displayName: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.update({
		where: {
			name: name.toLowerCase(),
		},
		data: {
			displayName,
		},
	})
}

export async function updateDescription(name: string, description: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.update({
		where: {
			name: name.toLowerCase(),
		},
		data: {
			description,
		},
	})
}
