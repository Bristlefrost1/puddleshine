import * as DAPI from 'discord-api-types/v10';

import * as defer from '#discord/responses-deferred.js';
import { messageResponse } from '#discord/responses.js';

import * as archive from '#commands/catcha/archive/archive.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';

import * as tradeConfirmation from './trade-confirmation.js';
import { getCurrentlyTradeBlocked } from './block.js';
import { getTradeCooldown } from './cooldown.js';

import * as config from '#config.js';

type Trade = Awaited<ReturnType<typeof catchaDB.updateTrade>>;

function calculateStarValue(cardId: number, isInverted?: boolean, variant?: string | null) {
	let starValue = 0;
	const cardDetails = archive.getCardDetailsById(cardId)!;

	starValue = cardDetails.rarity;

	if (variant) starValue = 100;
	if (isInverted) starValue = starValue * 2;

	return starValue;
}

async function processTrade(
	interaction: DAPI.APIMessageComponentInteraction,
	trade: Trade,
	senderDiscordId: string,
	recipientDiscordId: string,
	env: Env,
): Promise<DAPI.APIInteractionResponse> {
	// The time of the trade
	const currentDate = new Date();
	const currentTimeMs = currentDate.getTime();
	const currentUnixTime = Math.floor(currentTimeMs / 1000);

	// The existing embed of the trade confirmation message
	const oldEmbed = interaction.message.embeds[0];

	if (!oldEmbed || !oldEmbed.fields || !oldEmbed.timestamp) {
		await catchaDB.deleteTrade(env.PRISMA, trade.tradeUuid); // Cancel the trade

		return messageResponse({
			content: 'Could not find the trade confirmation embed. Trade canceled.',
			components: [],
			update: true,
		});
	}

	// The new embed that will replace the old one after the trade has been processed
	const newEmbed: DAPI.APIEmbed = {
		title: undefined,
		fields: oldEmbed.fields,
		timestamp: oldEmbed.timestamp,
		footer: { text: '✅/✅' },
	};

	const tradeEmbedUpdated = Date.parse(oldEmbed.timestamp);

	if (trade.updatedAt.getTime() > tradeEmbedUpdated) {
		return tradeConfirmation.createTradeConfirmation(
			trade,
			senderDiscordId,
			oldEmbed.fields[0].name,
			recipientDiscordId,
			oldEmbed.fields[1].name,
			oldEmbed.footer?.text,
			true,
		);
	}

	// Check that neither side has been trade blocked
	const senderTradeBlocked = getCurrentlyTradeBlocked(trade.sender as any, currentTimeMs);
	const recipientTradeBlocked = getCurrentlyTradeBlocked(trade.recipient as any, currentTimeMs);

	if (senderTradeBlocked.currentlyBlocked || recipientTradeBlocked.currentlyBlocked) {
		newEmbed.footer = undefined;
		newEmbed.timestamp = undefined;

		await catchaDB.deleteTrade(env.PRISMA, trade.tradeUuid); // Cancel the trade

		return messageResponse({
			content: 'Trade canceled due to a trade block.',
			embeds: [newEmbed],
			components: [],
			update: true,
		});
	}

	// Check the cooldowns
	const senderCooldown = getTradeCooldown(trade.sender as any, currentUnixTime);
	const recipientCooldown = getTradeCooldown(trade.recipient as any, currentUnixTime);

	if (senderCooldown.isOnCooldown || recipientCooldown.isOnCooldown) {
		newEmbed.footer = undefined;
		newEmbed.timestamp = undefined;

		await catchaDB.deleteTrade(env.PRISMA, trade.tradeUuid); // Cancel the trade

		return messageResponse({
			content: 'Trade canceled due to cooldown.',
			embeds: [newEmbed],
			components: [],
			update: true,
		});
	}

	// Calculate the star values of both sides
	let senderSideStarValue = 0;
	let recipientSideStarValue = 0;

	for (const card of trade.senderCards) {
		if (card.burned) {
			newEmbed.footer = undefined;
			newEmbed.timestamp = undefined;

			await catchaDB.deleteTrade(env.PRISMA, trade.tradeUuid); // Cancel the trade

			return messageResponse({
				content: 'This trade has been canceled as it contains burned cards.',
				embeds: [newEmbed],
				components: [],
				update: true,
			});
		}

		senderSideStarValue += calculateStarValue(card.cardId, card.isInverted, card.variant);
	}

	for (const card of trade.recipientCards) {
		if (card.burned) {
			newEmbed.footer = undefined;
			newEmbed.timestamp = undefined;

			await catchaDB.deleteTrade(env.PRISMA, trade.tradeUuid); // Cancel the trade

			return messageResponse({
				content: 'This trade has been canceled as it contains burned cards.',
				embeds: [newEmbed],
				components: [],
				update: true,
			});
		}

		recipientSideStarValue += calculateStarValue(card.cardId, card.isInverted, card.variant);
	}

	// The difference
	const starValueDifference = Math.abs(senderSideStarValue - recipientSideStarValue);

	/*
	// Decline if the trade is unfair
	if (starValueDifference > config.CATCHA_TRADE_MAX_STAR_VALUE_DIFFERENCE) {
		await catchaDB.deleteTrade(env.PRISMA, trade.tradeUuid); // Cancel the trade
		await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
			content: 'This trade has been blocked as potentially unfair or suspicious.',
			embeds: [newEmbed],
			components: [],
		});

		return;
	}
	*/

	// Get the card UUIDs to trade
	const senderCardUuidsToTrade = trade.senderCards.map((card) => card.uuid);
	const recipientCardUuidsToTrade = trade.recipientCards.map((card) => card.uuid);

	// Write the trade to the database
	await catchaDB.trade(env.PRISMA, {
		tradeUuid: trade.tradeUuid,

		senderUserUuid: trade.senderUserUuid,
		recipientUserUuid: trade.recipientUserUuid,

		senderCardUuidsToTrade: senderCardUuidsToTrade,
		recipientCardUuidsToTrade: recipientCardUuidsToTrade,

		tradeDate: currentDate,
	});

	// Trade approved
	return messageResponse({
		content: 'Trade approved.',
		embeds: [newEmbed],
		components: [],
		update: true,
	});
}

export { processTrade };
