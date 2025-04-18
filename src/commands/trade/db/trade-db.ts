import type { Prisma } from '@prisma/client'

import * as database from '@/db/database'
import { type D1PrismaClient } from '@/db/database'
import { type Kit } from '@/commands/nursery/game/kit'

export async function findTrade(prisma: D1PrismaClient, tradeUuid: string, completed?: boolean) {
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
			senderKits: true,
			recipientKits: true,
		},
	})

	return result
}

export async function findUserPendingTrades(prisma: D1PrismaClient, userUuid: string) {
	const result = await prisma.catchaTrade.findMany({
		where: {
			tradeCompleted: false,
			OR: [{ senderUserUuid: userUuid }, { recipientUserUuid: userUuid }],
		},
	})

	return result
}

export async function findTradesBetweenUsers(
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
			senderKits: true,
			recipientKits: true,
		},
	})

	return result
}

export async function createTrade(
	prisma: D1PrismaClient,
	options: {
		senderUserUuid: string
		recipientUserUuid: string
		sentCardUuids?: string[]
		sentKitUuids?: string[]
	},
) {
	const sentCardUuids =
		options.sentCardUuids ?
			options.sentCardUuids.map((cardUuid) => {
				return { uuid: cardUuid }
			})
		:	undefined
	const sentKitUuids =
		options.sentKitUuids ?
			options.sentKitUuids.map((kitUuid) => {
				return { uuid: kitUuid }
			})
		:	undefined
	const createdAt = new Date()

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
			senderCards:
				sentCardUuids !== undefined && sentCardUuids.length > 0 ?
					{
						connect: sentCardUuids,
					}
				:	undefined,
			senderKits:
				sentKitUuids !== undefined && sentKitUuids.length > 0 ?
					{
						connect: sentKitUuids,
					}
				:	undefined,
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
	})

	return result
}

export async function updateTrade(
	prisma: D1PrismaClient,
	tradeUuid: string,
	options: {
		tradeCompleted?: boolean
		tradeCompletedAt?: Date

		senderCardUuids?: string[]
		senderKitUuids?: string[]
		senderSideSent?: boolean
		senderAccepted?: boolean

		recipientCardUuids?: string[]
		recipientKitUuids?: string[]
		recipientSideSent?: boolean
		recipientAccepted?: boolean
	},
) {
	const updatedAt = new Date()

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
							return { uuid: cardUuid }
						}),
					}
				:	undefined,
			senderKits:
				options.senderKitUuids ?
					{
						set: options.senderKitUuids.map((kitUuid) => {
							return { uuid: kitUuid }
						}),
					}
				:	undefined,
			senderSideSent: options.senderSideSent,
			senderAccepted: options.senderAccepted,

			recipientCards:
				options.recipientCardUuids ?
					{
						set: options.recipientCardUuids.map((cardUuid) => {
							return { uuid: cardUuid }
						}),
					}
				:	undefined,
			recipientKits:
				options.recipientKitUuids ?
					{
						set: options.recipientKitUuids.map((kitUuid) => {
							return { uuid: kitUuid }
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
			senderKits: true,
			recipientKits: true,
		},
	})

	return result
}

export async function deleteTrade(prisma: D1PrismaClient, tradeUuid: string) {
	const result = await prisma.catchaTrade.delete({
		where: {
			tradeUuid: tradeUuid,
		},
	})

	return result
}

export async function deleteTrades(prisma: D1PrismaClient, tradeUuids: string[]) {
	const result = await prisma.catchaTrade.deleteMany({
		where: {
			OR: tradeUuids.map((tradeUuid) => {
				return { tradeUuid: tradeUuid }
			}),
		},
	})

	return result
}

export async function completeTrade(
	prisma: D1PrismaClient,
	options: {
		tradeUuid: string

		senderUserUuid: string
		recipientUserUuid: string

		senderCardUuidsToTrade: string[]
		recipientCardUuidsToTrade: string[]

		senderKitsToTrade: Kit[]
		recipientKitsToTrade: Kit[]

		tradeDate: Date
	},
) {
	await prisma.$transaction(
		[
			// Cards from the trade request sender to the trade request recipient
			options.senderCardUuidsToTrade.length > 0 ?
				prisma.catchaCard.updateMany({
					where: {
						ownerUuid: options.senderUserUuid,
						OR: options.senderCardUuidsToTrade.map((cardUuid) => {
							return { uuid: cardUuid }
						}),
					},
					data: {
						ownerUuid: options.recipientUserUuid,
						obtainedAt: options.tradeDate,
						obtainedFrom: 'TRADE',

						pendingTradeUuid1: null,
						pendingTradeUuid2: null,
					},
				})
			:	undefined,
			// Add the trade to the cards' histories
			options.senderCardUuidsToTrade.length > 0 ?
				prisma.catchaCardHistoryEvent.createMany({
					data: options.senderCardUuidsToTrade.map((cardUuid) => {
						return {
							cardUuid: cardUuid,
							timestamp: options.tradeDate,

							event: 'TRADE',
							eventDetails: options.tradeUuid,

							userUuid: options.recipientUserUuid,
						}
					}),
				})
			:	undefined,
			// Cards from the trade request recipient to the trade request sender
			options.recipientCardUuidsToTrade.length > 0 ?
				prisma.catchaCard.updateMany({
					where: {
						ownerUuid: options.recipientUserUuid,
						OR: options.recipientCardUuidsToTrade.map((cardUuid) => {
							return { uuid: cardUuid }
						}),
					},
					data: {
						ownerUuid: options.senderUserUuid,
						obtainedAt: options.tradeDate,
						obtainedFrom: 'TRADE',

						pendingTradeUuid1: null,
						pendingTradeUuid2: null,
					},
				})
			:	undefined,
			// Add the trade to the cards' histories
			options.recipientCardUuidsToTrade.length > 0 ?
				prisma.catchaCardHistoryEvent.createMany({
					data: options.recipientCardUuidsToTrade.map((cardUuid) => {
						return {
							cardUuid: cardUuid,
							timestamp: options.tradeDate,

							event: 'TRADE',
							eventDetails: options.tradeUuid,

							userUuid: options.senderUserUuid,
						}
					}),
				})
			:	undefined,
			// Sender kits
			...options.senderKitsToTrade.map((kit) => {
				return prisma.nurseryKit.update({
					where: {
						uuid: kit.uuid,
					},
					data: {
						ageMoons: kit.age,
						ageUpdated: options.tradeDate,

						health: kit.health,
						healthUpdated: options.tradeDate,

						hunger: kit.hunger,
						hungerUpdated: options.tradeDate,

						bond: 0,
						bondUpdated: options.tradeDate,

						temperature: kit.temperature,
						temperatureUpdated: options.tradeDate,

						adoptedAt: options.tradeDate,

						pendingTradeSide1: {
							disconnect: true,
						},
						pendingTradeSide2: {
							disconnect: true,
						},

						nursery: {
							connect: {
								uuid: options.recipientUserUuid,
							},
						},
					},
				})
			}),
			// Recipient kits
			...options.recipientKitsToTrade.map((kit) => {
				return prisma.nurseryKit.update({
					where: {
						uuid: kit.uuid,
					},
					data: {
						ageMoons: kit.age,
						ageUpdated: options.tradeDate,

						health: kit.health,
						healthUpdated: options.tradeDate,

						hunger: kit.hunger,
						hungerUpdated: options.tradeDate,

						bond: 0,
						bondUpdated: options.tradeDate,

						temperature: kit.temperature,
						temperatureUpdated: options.tradeDate,

						adoptedAt: options.tradeDate,

						pendingTradeSide1: {
							disconnect: true,
						},
						pendingTradeSide2: {
							disconnect: true,
						},

						nursery: {
							connect: {
								uuid: options.senderUserUuid,
							},
						},
					},
				})
			}),
			// Set the users' lastTradedAt
			prisma.catcha.updateMany({
				where: {
					OR: [options.senderUserUuid, options.recipientUserUuid].map((uuid) => {
						return { userUuid: uuid }
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
		].filter((value) => value !== undefined) as any,
	)
}
