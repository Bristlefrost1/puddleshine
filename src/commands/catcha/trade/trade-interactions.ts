import * as DAPI from 'discord-api-types/v10';

import * as defer from '#discord/responses-deferred.js';
import { simpleEphemeralResponse } from '#discord/responses.js';

import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import { processTradeRequest } from './trade-request.js';
import * as tradeConfirmation from './trade-confirmation.js';

import * as config from '#config.js';

async function onTradeRequest(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	/**
	 * The Discord user ID of the `user` command option.
	 */
	let commandOptionUserId: string | undefined;

	/**
	 * The value of the `cards` option (should be card positions separated by commas).
	 */
	let cardsString: string | undefined;

	// Parse options of the trade request command
	for (const option of commandOptions) {
		switch (option.name) {
			case 'user':
				if (option.type === DAPI.ApplicationCommandOptionType.User) commandOptionUserId = option.value;
				continue;
			case 'cards':
				if (option.type === DAPI.ApplicationCommandOptionType.String) cardsString = option.value;
				continue;
			default:
				continue;
		}
	}

	// This is mainly just to make TypeScript happy. The options are already required but
	// TS wants us to make sure they really are there.
	if (!commandOptionUserId || !cardsString || cardsString.trim() === '') {
		return simpleEphemeralResponse("You haven't provided the required user and cards options.");
	}

	// Ensure the user isn't trying to send a trade request to themself
	if (commandOptionUserId === user.id) return simpleEphemeralResponse('You cannot send a trade request to yourself.');

	// Turn the string of card positions separated by commas into an array of card positions as numbers
	// Trim the positions supplied by the user and filter out any NaNs (if the user entered something else than a number)
	const cardPositions = cardsString
		.split(',')
		.map((value) => Number.parseInt(value.trim()))
		.filter((value) => !isNaN(value));

	// Check that the user actually supplied cards to trade and that there aren't too many cards
	if (cardPositions.length < 1) {
		return simpleEphemeralResponse("You haven't provided any cards.");
	} else if (cardPositions.length > config.CATCHA_TRADE_MAX_CARDS) {
		return simpleEphemeralResponse(`You can only trade up to ${config.CATCHA_TRADE_MAX_CARDS} at once.`);
	}

	// No trades in DMs
	if (interaction.channel.type === DAPI.ChannelType.DM) {
		return simpleEphemeralResponse(
			"You cannot trade in the bot's DMs. The other user must be able to see the trade confirmation in order to be able to approve or decline the trade.",
		);
	}

	// The trade request is valid, process it
	ctx.waitUntil(
		processTradeRequest(interaction, env, ctx, {
			user: user,
			otherUserDiscordId: commandOptionUserId,
			cardPositions: cardPositions,
		}),
	);

	// Defer the trade request/confirmation message
	// Processing the trade can take a few seconds with a large number of cards
	return defer.deferMessage();
}

async function onTradeCancel(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	triggeredUser: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	let userIdOption: string | undefined = undefined;

	for (const option of commandOptions) {
		switch (option.name) {
			case 'user':
				if (option.type === DAPI.ApplicationCommandOptionType.User) userIdOption = option.value;
				continue;
			default:
				continue;
		}
	}

	if (!userIdOption) {
		return {
			type: DAPI.InteractionResponseType.ChannelMessageWithSource,
			data: {
				flags: DAPI.MessageFlags.Ephemeral,
				content: "You haven't provided the required user option.",
			},
		};
	}

	const userCatcha = await catchaDB.findCatcha(env.PRISMA, triggeredUser.id);
	const otherUserCatcha = await catchaDB.findCatcha(env.PRISMA, userIdOption);

	if (userCatcha && otherUserCatcha) {
		const pendingTradeUuids = (
			await catchaDB.findTradesBetweenUsers(env.PRISMA, userCatcha.userUuid, otherUserCatcha.userUuid, false)
		).map((trade) => trade.tradeUuid);

		if (pendingTradeUuids.length > 0) {
			await catchaDB.deleteTrades(env.PRISMA, pendingTradeUuids);
		}
	}

	return {
		type: DAPI.InteractionResponseType.ChannelMessageWithSource,
		data: {
			content: `Canceled all pending trades with <@${userIdOption}>.`,
			allowed_mentions: {
				users: [],
				roles: [],
			},
		},
	};
}

async function onTradeClear(
	interaction: DAPI.APIApplicationCommandInteraction,
	triggeredUser: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const userCatcha = await catchaDB.findCatcha(env.PRISMA, triggeredUser.id);

	if (userCatcha) {
		const pendingTradeUuids = (await catchaDB.findUserPendingTrades(env.PRISMA, userCatcha.userUuid)).map(
			(trade) => trade.tradeUuid,
		);

		if (pendingTradeUuids.length > 0) {
			await catchaDB.deleteTrades(env.PRISMA, pendingTradeUuids);
		}
	}

	return {
		type: DAPI.InteractionResponseType.ChannelMessageWithSource,
		data: {
			content: `Cleared your pending trades.`,
		},
	};
}

async function onTradeMessageComponent(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[],
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	// The trade confirmation accept/decline button custom ID is of format
	// catcha/trade/[y or n]/[trade UUID],[side 1 Discord ID],[side 2 Discord ID]
	const yesOrNo = parsedCustomId[2] as 'y' | 'n'; // y = accept, n = decline
	const interactionData = parsedCustomId[3].split(','); // Parse the last part of the custom ID

	// Grab the Discord IDs of the parties
	const senderDiscordId = interactionData[1]; // Side 1 Discord ID
	const recipientDiscordId = interactionData[2]; // Side 2 Discord ID

	// Make sure the user is a party to the trade
	if (user.id !== senderDiscordId && user.id !== recipientDiscordId) {
		return simpleEphemeralResponse('This is not your trade.');
	}

	if (yesOrNo === 'y') {
		// Accept the trade
		ctx.waitUntil(tradeConfirmation.accept(interaction, interactionData, user, env));
	} else {
		// Decline it
		ctx.waitUntil(tradeConfirmation.decline(interaction, interactionData, user, env));
	}

	// Defer the message update since trading can take some time, especially with the max cards
	return { type: DAPI.InteractionResponseType.DeferredMessageUpdate };
}

export { onTradeRequest, onTradeCancel, onTradeClear, onTradeMessageComponent };
