import type { D1PrismaClient } from '#/db/database.js';

async function findArtistProfile(name: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.findUnique({
		where: {
			name: name.toLowerCase(),
		},
	});
}

async function findArtistProfileWithDiscordId(discordId: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.findFirst({
		where: {
			discordId,
		},
	});
}

async function initializeArtistProfile(name: string, discordId: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.create({
		data: {
			name: name.toLowerCase(),
			discordId,
		},
	});
}

async function linkArtistProfile(name: string, discordId: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.update({
		where: {
			name: name.toLowerCase(),
		},
		data: {
			discordId,
		},
	});
}

async function renameArtist(name: string, newName: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.update({
		where: {
			name: name.toLowerCase(),
		},
		data: {
			name: newName,
		},
	});
}

async function updateDisplayName(name: string, displayName: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.update({
		where: {
			name: name.toLowerCase(),
		},
		data: {
			displayName,
		},
	});
}

async function updateDescription(name: string, description: string, prisma: D1PrismaClient) {
	return await prisma.artistProfile.update({
		where: {
			name: name.toLowerCase(),
		},
		data: {
			description,
		},
	});
}

export {
	findArtistProfile,
	findArtistProfileWithDiscordId,
	initializeArtistProfile,
	linkArtistProfile,
	renameArtist,
	updateDisplayName,
	updateDescription,
};
