import * as database from '#db/database.js';

import type { D1PrismaClient } from '#/db/database.js';
import type { Prisma } from '@prisma/client';

async function findCatcha(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.catcha.findFirst({
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

async function initializeCatchaForUser(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.catcha.create({
		data: {
			lastRollPeriod: null,
			lastRollCount: null,
			lastClaim: null,

			user: {
				connectOrCreate: {
					where: {
						discordId: discordId,
					},
					create: database.createInitialUser(discordId),
				},
			},
		},
	});
}

async function updateCatcha(prisma: D1PrismaClient, userUuid: string, data: Prisma.CatchaUpdateInput) {
	const result = await prisma.catcha.update({
		where: {
			userUuid: userUuid,
		},
		data: data,
	});
}

async function updateCatchas(prisma: D1PrismaClient, userUuids: string[], data: Prisma.CatchaUpdateInput) {
	const result = await prisma.catcha.updateMany({
		where: {
			OR: userUuids.map((uuid) => {
				return { userUuid: uuid };
			}),
		},
		data: data,
	});
}

async function findCardByUuid(prisma: D1PrismaClient, cardUuid: string) {
	const card = await prisma.catchaCard.findUnique({
		where: {
			uuid: cardUuid,
		},
	});

	return card;
}

async function insertCard(
	prisma: D1PrismaClient,
	userUuid: string,
	cardId: number,
	obtainedAt: Date,
	obtainedFrom: string,
	isInverted: boolean,
	variant: string | null,
) {
	const result = await prisma.catchaCard.create({
		data: {
			uuid: crypto.randomUUID(),
			cardId: cardId,

			obtainedAt: obtainedAt,
			obtainedFrom: obtainedFrom,

			isInverted: isInverted,
			variant: variant,

			catcha: {
				connect: {
					userUuid: userUuid,
				},
			},
		},
	});

	return result;
}

async function inserCardHistoryEvent(
	prisma: D1PrismaClient,
	cardUuid: string,
	timestamp: Date,
	event: string,
	eventDetails?: string,
	userUuid?: string,
) {
	const result = await prisma.catchaCardHistoryEvent.create({
		data: {
			timestamp: timestamp,

			event: event,
			eventDetails: eventDetails ? eventDetails : null,

			card: {
				connect: {
					uuid: cardUuid,
				},
			},

			catcha:
				userUuid ?
					{
						connect: {
							userUuid: userUuid,
						},
					}
				:	undefined,
		},
	});
}

async function claimCard(
	prisma: D1PrismaClient,
	options: {
		userUuid: string;
		cardId: number;
		claimTime: Date;
		isInverted: boolean;
		variant: string | null;
	},
) {
	const cardUuid = crypto.randomUUID();

	await prisma.$transaction([
		// Insert the card itself into the DB
		prisma.catchaCard.create({
			data: {
				uuid: cardUuid,
				cardId: options.cardId,

				obtainedAt: options.claimTime,
				obtainedFrom: 'ROLL', // Obtained from rolling

				isInverted: options.isInverted,
				variant: options.variant,

				catcha: {
					connect: {
						userUuid: options.userUuid,
					},
				},
			},
		}),
		// Insert the card history event
		prisma.catchaCardHistoryEvent.create({
			data: {
				timestamp: options.claimTime,

				event: 'CLAIM',
				eventDetails: null,

				card: {
					connect: {
						uuid: cardUuid,
					},
				},

				catcha: {
					connect: {
						userUuid: options.userUuid,
					},
				},
			},
		}),
		// Set the last claim time on the user's Catcha
		prisma.catcha.update({
			where: {
				userUuid: options.userUuid,
			},
			data: {
				lastClaim: options.claimTime,
				rollCache: null,
			},
		}),
	]);
}

async function burnCardUuids(prisma: D1PrismaClient, userUuid: string, cardUuids: string[]) {
	await prisma.$transaction([
		prisma.catchaCard.deleteMany({
			where: {
				OR: cardUuids.map((cardUuid) => {
					return { uuid: cardUuid };
				}),
			},
		}),
		prisma.catcha.update({
			where: {
				userUuid: userUuid,
			},
			data: { rollCache: null },
		}),
	]);
}

async function getCardCollection(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.catchaCard.findMany({
		where: {
			catcha: {
				user: {
					discordId: discordId,
				},
			},
		},
	});

	return result;
}

async function findUserCardsWithCardId(prisma: D1PrismaClient, userUuid: string, cardId: number) {
	const result = await prisma.catchaCard.findMany({
		where: {
			cardId,
			ownerUuid: userUuid,
		},
	});

	return result;
}

async function getCardHistoryEvents(prisma: D1PrismaClient, cardUuid: string) {
	const results = await prisma.catchaCardHistoryEvent.findMany({
		where: {
			cardUuid,
		},
		include: {
			catcha: {
				include: {
					user: true,
				},
			},
			card: true,
		},
		orderBy: {
			timestamp: 'desc',
		},
	});

	return results;
}

async function getTrade(prisma: D1PrismaClient, tradeUuid: string, completed?: boolean) {
	const result = await prisma.catchaTrade.findFirst({
		where: {
			tradeUuid: tradeUuid,
			tradeCompleted: completed,
		},
		include: {
			sender: true,
			senderCards: true,
			recipient: true,
			recipientCards: true,
		},
	});

	return result;
}

async function findUserPendingTrades(prisma: D1PrismaClient, userUuid: string) {
	const result = await prisma.catchaTrade.findMany({
		where: {
			tradeCompleted: false,
			OR: [{ senderUserUuid: userUuid }, { recipientUserUuid: userUuid }],
		},
	});

	return result;
}

async function findTradesBetweenUsers(
	prisma: D1PrismaClient,
	user1Uuid: string,
	user2Uuid: string,
	completed?: boolean,
) {
	const result = await prisma.catchaTrade.findMany({
		where: {
			tradeCompleted: completed,
			OR: [
				{
					senderUserUuid: user1Uuid,
					recipientUserUuid: user2Uuid,
				},
				{
					senderUserUuid: user2Uuid,
					recipientUserUuid: user1Uuid,
				},
			],
		},
		include: {
			sender: true,
			senderCards: true,
			recipient: true,
			recipientCards: true,
		},
	});

	return result;
}

async function createTrade(
	prisma: D1PrismaClient,
	options: {
		senderUserUuid: string;
		recipientUserUuid: string;
		sentCardUuids?: string[];
	},
) {
	const sentCardUuids =
		options.sentCardUuids ?
			options.sentCardUuids.map((cardUuid) => {
				return { uuid: cardUuid };
			})
		:	undefined;
	const createdAt = new Date();

	const result = await prisma.catchaTrade.create({
		data: {
			createdAt: createdAt,
			updatedAt: createdAt,
			tradeCompleted: false,

			sender: {
				connect: {
					userUuid: options.senderUserUuid,
				},
			},
			senderCards: {
				connect: sentCardUuids,
			},
			senderSideSent: true,
			senderAccepted: false,

			recipient: {
				connect: {
					userUuid: options.recipientUserUuid,
				},
			},
			recipientSideSent: false,
			recipientAccepted: false,
		},
		include: {
			sender: true,
			senderCards: true,
			recipient: true,
			recipientCards: true,
		},
	});

	return result;
}

async function updateTrade(
	prisma: D1PrismaClient,
	tradeUuid: string,
	options: {
		tradeCompleted?: boolean;
		tradeCompletedAt?: Date;

		senderCardUuids?: string[];
		senderSideSent?: boolean;
		senderAccepted?: boolean;

		recipientCardUuids?: string[];
		recipientSideSent?: boolean;
		recipientAccepted?: boolean;
	},
) {
	const updatedAt = new Date();

	const result = await prisma.catchaTrade.update({
		where: {
			tradeUuid: tradeUuid,
		},
		data: {
			updatedAt: updatedAt,

			tradeCompleted: options.tradeCompleted,
			tradedCompletedAt: options.tradeCompletedAt,

			senderCards:
				options.senderCardUuids ?
					{
						set: options.senderCardUuids.map((cardUuid) => {
							return { uuid: cardUuid };
						}),
					}
				:	undefined,
			senderSideSent: options.senderSideSent,
			senderAccepted: options.senderAccepted,

			recipientCards:
				options.recipientCardUuids ?
					{
						set: options.recipientCardUuids.map((cardUuid) => {
							return { uuid: cardUuid };
						}),
					}
				:	undefined,
			recipientSideSent: options.recipientSideSent,
			recipientAccepted: options.recipientAccepted,
		},
		include: {
			sender: true,
			senderCards: true,
			recipient: true,
			recipientCards: true,
		},
	});

	return result;
}

async function deleteTrade(prisma: D1PrismaClient, tradeUuid: string) {
	const result = await prisma.catchaTrade.delete({
		where: {
			tradeUuid: tradeUuid,
		},
	});

	return result;
}

async function deleteTrades(prisma: D1PrismaClient, tradeUuids: string[]) {
	const result = await prisma.catchaTrade.deleteMany({
		where: {
			OR: tradeUuids.map((tradeUuid) => {
				return { tradeUuid: tradeUuid };
			}),
		},
	});

	return result;
}

async function trade(
	prisma: D1PrismaClient,
	options: {
		tradeUuid: string;

		senderUserUuid: string;
		recipientUserUuid: string;

		senderCardUuidsToTrade: string[];
		recipientCardUuidsToTrade: string[];

		tradeDate: Date;
	},
) {
	await prisma.$transaction([
		// Cards from the trade request sender to the trade request recipient
		prisma.catchaCard.updateMany({
			where: {
				ownerUuid: options.senderUserUuid,
				OR: options.senderCardUuidsToTrade.map((cardUuid) => {
					return { uuid: cardUuid };
				}),
			},
			data: {
				ownerUuid: options.recipientUserUuid,
				obtainedAt: options.tradeDate,
				obtainedFrom: 'TRADE',

				pendingTradeUuid1: null,
				pendingTradeUuid2: null,
			},
		}),
		// Add the trade to the cards' histories
		prisma.catchaCardHistoryEvent.createMany({
			data: options.senderCardUuidsToTrade.map((cardUuid) => {
				return {
					cardUuid: cardUuid,
					timestamp: options.tradeDate,

					event: 'TRADE',
					eventDetails: options.tradeUuid,

					userUuid: options.recipientUserUuid,
				};
			}),
		}),
		// Cards from the trade request recipient to the trade request sender
		prisma.catchaCard.updateMany({
			where: {
				ownerUuid: options.recipientUserUuid,
				OR: options.recipientCardUuidsToTrade.map((cardUuid) => {
					return { uuid: cardUuid };
				}),
			},
			data: {
				ownerUuid: options.senderUserUuid,
				obtainedAt: options.tradeDate,
				obtainedFrom: 'TRADE',

				pendingTradeUuid1: null,
				pendingTradeUuid2: null,
			},
		}),
		// Add the trade to the cards' histories
		prisma.catchaCardHistoryEvent.createMany({
			data: options.recipientCardUuidsToTrade.map((cardUuid) => {
				return {
					cardUuid: cardUuid,
					timestamp: options.tradeDate,

					event: 'TRADE',
					eventDetails: options.tradeUuid,

					userUuid: options.senderUserUuid,
				};
			}),
		}),
		// Set the users' lastTradedAt
		prisma.catcha.updateMany({
			where: {
				OR: [options.senderUserUuid, options.recipientUserUuid].map((uuid) => {
					return { userUuid: uuid };
				}),
			},
			data: { lastTradedAt: options.tradeDate, rollCache: null },
		}),
		// Mark the trade as complete
		prisma.catchaTrade.update({
			where: {
				tradeUuid: options.tradeUuid,
			},
			data: {
				tradeCompleted: true,
				tradedCompletedAt: options.tradeDate,
				senderAccepted: true,
				recipientAccepted: true,
			},
		}),
	]);
}

export {
	findCatcha,
	initializeCatchaForUser,
	updateCatcha,
	updateCatchas,
	findCardByUuid,
	findUserCardsWithCardId,
	insertCard,
	inserCardHistoryEvent,
	burnCardUuids,
	getCardCollection,
	getCardHistoryEvents,
	claimCard,
	getTrade,
	findUserPendingTrades,
	findTradesBetweenUsers,
	createTrade,
	updateTrade,
	deleteTrade,
	deleteTrades,
	trade,
};
