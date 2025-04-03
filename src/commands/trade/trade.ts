import * as DAPI from 'discord-api-types/v10'

import { messageResponse } from '@/discord/responses'
import { bot } from '@/bot'

import * as archive from '@/commands/catcha/archive'
import * as catchaDB from '@/db/catcha-db.js'
import * as nurseryDB from '@/commands/nursery/db/nursery-db'
import * as tradeDB from '@/commands/trade/db/trade-db'
import { getKit, Kit } from '@/commands/nursery/game/kit'

import * as tradeConfirmation from './confirmation'
import { getCurrentlyTradeBlocked } from './restrictions/block'
import { getTradeCooldown } from './restrictions/cooldown'

import * as config from '@/config'

type Trade = Awaited<ReturnType<typeof tradeDB.updateTrade>>

async function calculateStarValue(cardId: number, isInverted?: boolean, variant?: string | null) {
	let starValue = 0

	const cardDetails = await archive.getCardDetailsById(cardId)
	if (cardDetails === undefined) return 0

	starValue = cardDetails.rarity

	if (variant) starValue = 100
	if (isInverted) starValue = starValue * 2

	return starValue
}

export async function processTrade(
	interaction: DAPI.APIMessageComponentInteraction,
	trade: Trade,
	senderDiscordId: string,
	recipientDiscordId: string,
): Promise<DAPI.APIInteractionResponseChannelMessageWithSource | DAPI.APIInteractionResponseUpdateMessage> {
	// The time of the trade
	const currentDate = new Date()
	const currentTimeMs = currentDate.getTime()
	const currentUnixTime = Math.floor(currentTimeMs / 1000)

	// The existing embed of the trade confirmation message
	const oldEmbed = interaction.message.embeds[0]

	if (!oldEmbed || !oldEmbed.fields || !oldEmbed.timestamp) {
		await tradeDB.deleteTrade(bot.prisma, trade.tradeUuid) // Cancel the trade

		return messageResponse({
			content: 'Could not find the trade confirmation embed. Trade canceled.',
			components: [],
			update: true,
		})
	}

	// The new embed that will replace the old one after the trade has been processed
	const newEmbed: DAPI.APIEmbed = {
		title: undefined,
		fields: oldEmbed.fields,
		timestamp: oldEmbed.timestamp,
		footer: { text: '✅/✅' },
	}

	const tradeEmbedUpdated = Date.parse(oldEmbed.timestamp)

	if (trade.updatedAt.getTime() > tradeEmbedUpdated) {
		return tradeConfirmation.createTradeConfirmationResponse(
			trade,
			senderDiscordId,
			oldEmbed.fields[0].name,
			recipientDiscordId,
			oldEmbed.fields[1].name,
			oldEmbed.footer?.text,
			true,
		)
	}

	if (trade.tradeCompleted) {
		return messageResponse({
			content: 'This trade has already been completed.',
			embeds: [newEmbed],
			components: [],
			update: true,
		})
	}

	// prettier-ignore
	if (trade.senderCards.length === 0 && trade.senderKits.length === 0 && trade.recipientCards.length === 0 && trade.recipientKits.length === 0) {
		await tradeDB.deleteTrade(bot.prisma, trade.tradeUuid) // Cancel the trade

		return messageResponse({
			content: "There's nothing to trade.",
			embeds: [newEmbed],
			components: [],
			update: true,
		})
	}

	// Check that neither side has been trade blocked
	const senderTradeBlocked = getCurrentlyTradeBlocked(trade.sender as any, currentTimeMs)
	const recipientTradeBlocked = getCurrentlyTradeBlocked(trade.recipient as any, currentTimeMs)

	if (senderTradeBlocked.currentlyBlocked || recipientTradeBlocked.currentlyBlocked) {
		newEmbed.footer = undefined
		newEmbed.timestamp = undefined

		await tradeDB.deleteTrade(bot.prisma, trade.tradeUuid); // Cancel the trade

		return messageResponse({
			content: 'Trade canceled due to a trade block.',
			embeds: [newEmbed],
			components: [],
			update: true,
		})
	}

	// Check the cooldowns
	const senderCooldown = getTradeCooldown(trade.sender as any, currentUnixTime)
	const recipientCooldown = getTradeCooldown(trade.recipient as any, currentUnixTime)

	if (senderCooldown.isOnCooldown || recipientCooldown.isOnCooldown) {
		newEmbed.footer = undefined
		newEmbed.timestamp = undefined

		await tradeDB.deleteTrade(bot.prisma, trade.tradeUuid) // Cancel the trade

		return messageResponse({
			content: 'Trade canceled due to cooldown.',
			embeds: [newEmbed],
			components: [],
			update: true,
		})
	}

	// Calculate the star values of both sides
	let senderSideStarValue = 0
	let recipientSideStarValue = 0

	for (const card of trade.senderCards) {
		if (card.burned) {
			newEmbed.footer = undefined
			newEmbed.timestamp = undefined

			await tradeDB.deleteTrade(bot.prisma, trade.tradeUuid) // Cancel the trade

			return messageResponse({
				content: 'This trade has been canceled as it contains burned cards.',
				embeds: [newEmbed],
				components: [],
				update: true,
			})
		}

		senderSideStarValue += await calculateStarValue(card.cardId, card.isInverted, card.variant)
	}

	for (const card of trade.recipientCards) {
		if (card.burned) {
			newEmbed.footer = undefined
			newEmbed.timestamp = undefined

			await tradeDB.deleteTrade(bot.prisma, trade.tradeUuid) // Cancel the trade

			return messageResponse({
				content: 'This trade has been canceled as it contains burned cards.',
				embeds: [newEmbed],
				components: [],
				update: true,
			})
		}

		recipientSideStarValue += await calculateStarValue(card.cardId, card.isInverted, card.variant)
	}

	/*
	// The difference
	const starValueDifference = Math.abs(senderSideStarValue - recipientSideStarValue)
	
	// Decline if the trade is unfair
	if (starValueDifference > config.CATCHA_TRADE_MAX_STAR_VALUE_DIFFERENCE) {
		await catchaDB.deleteTrade(bot.prisma, trade.tradeUuid); // Cancel the trade
		await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
			content: 'This trade has been blocked as potentially unfair or suspicious.',
			embeds: [newEmbed],
			components: [],
		});

		return;
	}
	*/

	// Get the card UUIDs to trade
	const senderCardUuidsToTrade = trade.senderCards.map((card) => card.uuid)
	const recipientCardUuidsToTrade = trade.recipientCards.map((card) => card.uuid)

	// Process the kits in the trade if there are any
	const senderKits: Kit[] = []
	const recipientKits: Kit[] = []

	for (const senderKit of trade.senderKits) {
		const kit = getKit(senderKit, 0)

		if (kit.isDead) {
			await tradeDB.deleteTrade(bot.prisma, trade.tradeUuid) // Cancel the trade

			return messageResponse({
				content: "This trade has been canceled as it contains kits that've died.",
				embeds: [newEmbed],
				components: [],
				update: true,
			})
		}

		if (kit.wanderingSince !== undefined) {
			await tradeDB.deleteTrade(bot.prisma, trade.tradeUuid) // Cancel the trade

			return messageResponse({
				content: `${kit.fullName} cannot be found in the nursery.`,
				embeds: [newEmbed],
				components: [],
				update: true,
			})
		}

		senderKits.push(kit)
	}

	for (const recipientKit of trade.recipientKits) {
		const kit = getKit(recipientKit, 0)

		if (kit.isDead) {
			await tradeDB.deleteTrade(bot.prisma, trade.tradeUuid) // Cancel the trade

			return messageResponse({
				content: "This trade has been canceled as it contains kits that've died.",
				embeds: [newEmbed],
				components: [],
				update: true,
			})
		}

		if (kit.wanderingSince !== undefined) {
			await tradeDB.deleteTrade(bot.prisma, trade.tradeUuid) // Cancel the trade

			return messageResponse({
				content: `${kit.fullName} cannot be found in the nursery.`,
				embeds: [newEmbed],
				components: [],
				update: true,
			})
		}

		recipientKits.push(kit)
	}

	if (senderKits.length > 0) {
		const recipientNursery = await nurseryDB.findNurseryByUuid(bot.prisma, trade.recipientUserUuid)
		if (!recipientNursery) await nurseryDB.initialiseNurseryForUser(bot.prisma, recipientDiscordId)
	}

	if (recipientKits.length > 0) {
		const senderNursery = await nurseryDB.findNurseryByUuid(bot.prisma, trade.senderUserUuid)
		if (!senderNursery) await nurseryDB.initialiseNurseryForUser(bot.prisma, senderDiscordId)
	}

	// Write the trade to the database
	await tradeDB.completeTrade(bot.prisma, {
		tradeUuid: trade.tradeUuid,

		senderUserUuid: trade.senderUserUuid,
		recipientUserUuid: trade.recipientUserUuid,

		senderCardUuidsToTrade: senderCardUuidsToTrade,
		recipientCardUuidsToTrade: recipientCardUuidsToTrade,

		senderKitsToTrade: senderKits,
		recipientKitsToTrade: recipientKits,

		tradeDate: currentDate,
	})

	// Trade approved
	return messageResponse({
		content: 'Trade approved.',
		embeds: [newEmbed],
		components: [],
		update: true,
	})
}
