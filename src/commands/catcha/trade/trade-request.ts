import * as DAPI from 'discord-api-types/v10';

import * as defer from '#discord/responses-deferred.js';
import * as discordUserUtils from '#discord/api/discord-user.js';
import { errorEmbed } from '#discord/responses.js';

import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import * as collection from '#commands/catcha/collection/collection.js';
import { stringifyCards } from '../collection/list-utils.js';

import * as tradeConfirmation from './trade-confirmation.js';
import { getCurrentlyTradeBlocked } from './block.js';
import { getTradeCooldown } from './cooldown.js';

import type { CatchaCard } from '@prisma/client';

import * as config from '#config.js';

function buildTradeRequestEmbed(cardsString: string): DAPI.APIEmbed {
	//const hours = Math.floor(config.CATCHA_TRADE_COOLDOWN / 3600);

	return {
		title: 'Requested a new trade',
		description: `\`\`\`less\n${cardsString}\`\`\`\nHave this user trade back to confirm the trade.`,
		footer: {
			text: `Notice: Trading doesn't have a cooldown but is limited to 50 cards per trade.`,
		},
	};
}

async function processTradeRequest(
	interaction: DAPI.APIApplicationCommandInteraction,
	env: Env,
	ctx: ExecutionContext,
	options: {
		user: DAPI.APIUser;
		otherUserDiscordId: string;
		cardPositions: number[];
	},
) {
	// The bot's application ID and token
	const applicationId = env.DISCORD_APPLICATION_ID;
	const discordToken = env.DISCORD_TOKEN;

	// The time of the trade request
	const currentDate = new Date();
	const currentTimeMs = currentDate.getTime();
	const currentUnixTime = Math.floor(currentTimeMs / 1000);

	/**
	 * The Discord ID of the user that is sending the trade request.
	 */
	const userDiscordId = options.user.id;

	/**
	 * The Catcha of the user that is sending the trade request.
	 */
	const userCatcha = await catchaDB.findCatcha(env.PRISMA, userDiscordId);

	// The user doesn't have a Catcha so they've never rolled before. Thus, they cannot possibly have any cards to give.
	if (!userCatcha) {
		await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
			embeds: [errorEmbed("You don't have any cards to trade in your collection.")],
		});

		return;
	}

	/**
	 * The Catcha of the other user (the one the trade request is being sent to)
	 */
	const otherUserCatcha = await catchaDB.findCatcha(env.PRISMA, options.otherUserDiscordId);

	// Same thing. If they don't have a Catcha in the database, they're not a player
	if (!otherUserCatcha) {
		await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
			embeds: [errorEmbed("The user doesn't have any cards to trade.")],
		});

		return;
	}

	const userTradeBlock = getCurrentlyTradeBlocked(userCatcha, currentTimeMs);

	if (userTradeBlock.currentlyBlocked) {
		// The user has an active trade block
		const { blockedUntilUnixTime, reason } = userTradeBlock;

		await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
			embeds: [
				errorEmbed(
					`You're blocked from trading${blockedUntilUnixTime !== undefined ? ` until <t:${blockedUntilUnixTime}:f>` : ' indefinitely'}.${reason ? ' Reason: ' + reason : ''}`,
				),
			],
		});

		return;
	}

	const otherUserTradeBlock = getCurrentlyTradeBlocked(otherUserCatcha, currentTimeMs);

	if (otherUserTradeBlock.currentlyBlocked) {
		// The other user is blocked
		await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
			embeds: [errorEmbed("The user you're attempting to trade is currently blocked from trading.")],
		});

		return;
	}

	const cooldown = getTradeCooldown(userCatcha, currentUnixTime);

	if (cooldown.isOnCooldown) {
		await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
			embeds: [
				errorEmbed(
					`You're on trade cooldown and can trade <t:${cooldown.canTradeAtUnixTime}:R> (at <t:${cooldown.canTradeAtUnixTime}:t>).`,
				),
			],
		});

		return;
	}

	const userCollection = await collection.getCollection(userDiscordId, env);
	const cardsToTrade: CatchaCard[] = [];

	for (const cardPosition of options.cardPositions) {
		const cardIndex = cardPosition - 1;
		const card = userCollection[cardIndex];

		if (!card) {
			await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
				embeds: [errorEmbed(`No card with the position ${cardPosition} found.`)],
			});

			return;
		}

		// We don't want anyone to find any crazy card duplication exploits so a card can only be in
		// one pending trade at a time.
		if (card.card.pendingTradeUuid1 !== null || card.card.pendingTradeUuid2 !== null) {
			await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
				embeds: [errorEmbed(`The card at position ${cardPosition} is already in another pending trade.`)],
			});

			return;
		}

		cardsToTrade.push(card.card);
	}

	const cardUuidsToTrade = cardsToTrade.map((card) => card.uuid); // We need the UUIDs of the cards to be traded
	const existingTrades = await catchaDB.findTradesBetweenUsers(
		env.PRISMA,
		userCatcha.userUuid,
		otherUserCatcha.userUuid,
		false,
	);

	// The sender (or side 1) is the one that created the trade request (sent their side first)
	// The recipient (or side 2) is the one that responded to the request

	// If there's an existing trade, update it instead of creating a new one
	if (existingTrades.length > 0) {
		const existingTrade = existingTrades[0];

		let updatedTrade: typeof existingTrade;
		let senderUser: DAPI.APIUser;
		let recipientUser: DAPI.APIUser;

		if (userCatcha.userUuid === existingTrade.recipientUserUuid) {
			// The user is responding to a trade request
			recipientUser = options.user;
			senderUser = (await discordUserUtils.discordGetUser(
				discordToken,
				options.otherUserDiscordId,
			)) as DAPI.APIUser;

			updatedTrade = await catchaDB.updateTrade(env.PRISMA, existingTrade.tradeUuid, {
				recipientCardUuids: cardUuidsToTrade,
				recipientSideSent: true,
			});
		} else {
			// The user may be trying to update an existing trade request they sent (if they forgot a card for instance)
			senderUser = options.user;
			recipientUser = (await discordUserUtils.discordGetUser(
				discordToken,
				options.otherUserDiscordId,
			)) as DAPI.APIUser;

			updatedTrade = await catchaDB.updateTrade(env.PRISMA, existingTrade.tradeUuid, {
				senderCardUuids: cardUuidsToTrade,
				senderSideSent: true,
			});
		}

		// If both parties have sent their sides, begin the trade confirmation
		if (updatedTrade.senderSideSent && updatedTrade.recipientSideSent) {
			await tradeConfirmation.createTradeConfirmation(interaction, senderUser, recipientUser, updatedTrade, env);

			return;
		} else {
			await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
				embeds: [buildTradeRequestEmbed(stringifyCards(cardsToTrade).join('\n'))],
			});
		}
	} else {
		// Create a brand new trade
		await catchaDB.createTrade(env.PRISMA, {
			senderUserUuid: userCatcha.userUuid,
			recipientUserUuid: otherUserCatcha.userUuid,
			sentCardUuids: cardUuidsToTrade,
		});

		await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
			embeds: [buildTradeRequestEmbed(stringifyCards(cardsToTrade).join('\n'))],
		});
	}
}

export { processTradeRequest };
