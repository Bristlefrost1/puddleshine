import { D1PrismaClient } from '#db/database.js';
import { ClanRank } from '#utils/clans.js';

async function findHistoryCats(prisma: D1PrismaClient, userUuid: string) {
	return await prisma.historyCat.findMany({
		where: {
			userUuid: userUuid,
		},
		orderBy: {
			dateStored: 'asc',
		},
	});
}

async function promoteApprentices(
	prisma: D1PrismaClient,
	apprentices: { uuid: string; newSuffix: string; newRank: ClanRank }[],
) {
	return await prisma.$transaction([
		...apprentices.map((apprentice) => {
			return prisma.historyCat.update({
				where: {
					uuid: apprentice.uuid,
				},
				data: {
					nameSuffix: apprentice.newSuffix,
					rank: apprentice.newRank,
				},
			});
		}),
	]);
}

export { findHistoryCats, promoteApprentices };
