import * as DAPI from 'discord-api-types/v10';

import * as discordUserUtils from '#discord/api/discord-user.js';
import { parseList } from '#utils/parse-list.js';
import { getPronouns } from '#cat/gender.js';

import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import * as collection from '#commands/catcha/collection/collection.js';
import { stringifyCards } from '#commands/catcha/collection/list-utils.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import { stringifyKitDescription, stringifyKitStats } from '#commands/nursery/nursery-views.js';

import * as tradeDB from '#commands/trade/db/trade-db.js';
import * as tradeConfirmation from '#commands/trade/confirmation.js';
import { getCurrentlyTradeBlocked } from '#commands/trade/restrictions/block.js';
import { getTradeCooldown } from '#commands/trade/restrictions/cooldown.js';

import { parseCommandOptions } from '#discord/parse-options.js';
import { messageResponse, simpleEphemeralResponse, errorEmbed } from '#discord/responses.js';

import type { Subcommand } from '#commands/subcommand.js';
import type { CatchaCard } from '@prisma/client';
import type { Kit } from '#commands/nursery/game/kit.js';

import * as config from '#config.js';

const SUBCOMMAND_NAME = 'request';

function buildTradeRequestEmbed(cards: CatchaCard[], kits: Kit[]): DAPI.APIEmbed {
	//const hours = Math.floor(config.CATCHA_TRADE_COOLDOWN / 3600);
	const descriptionLines: string[] = [];

	if (cards.length > 0) {
		descriptionLines.push('Cards:');
		descriptionLines.push('```less');
		descriptionLines.push(...stringifyCards(cards));
		descriptionLines.push('```');
	}

	if (kits.length > 0) {
		descriptionLines.push('Kits:');
		descriptionLines.push('```ansi');

		for (const kit of kits) {
			descriptionLines.push(stringifyKitDescription(kit, true));
			descriptionLines.push(stringifyKitStats(kit, true));
		}

		descriptionLines.push('```');
	}

	if (cards.length === 0 && kits.length === 0) {
		descriptionLines.push('```less');
		descriptionLines.push('Nothing');
		descriptionLines.push('```');
	}

	descriptionLines.push('Have this user trade back to begin the trade confirmation.');

	return {
		title: 'Requested a new trade',
		description: descriptionLines.join('\n'),
		footer: {
			text: `Notice: Trading doesn't have a cooldown but is limited to ${config.CATCHA_TRADE_MAX_CARDS} cards per trade.`,
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
		kitsToTrade: string[];
	},
): Promise<DAPI.APIInteractionResponse> {
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
	let userCatcha = await catchaDB.findCatcha(env.PRISMA, userDiscordId);

	// The user doesn't have a Catcha so they've never rolled before. Thus, they cannot possibly have any cards to give.
	if (!userCatcha) {
		if (options.cardPositions.length === 0) {
			userCatcha = await catchaDB.initializeCatchaForUser(env.PRISMA, options.user.id);
		} else {
			return messageResponse({ embeds: [errorEmbed("You don't have any cards to trade in your collection.")] });
		}
	}

	/**
	 * The Catcha of the other user (the one the trade request is being sent to)
	 */
	const otherUserCatcha = await catchaDB.findCatcha(env.PRISMA, options.otherUserDiscordId);

	// Same thing. If they don't have a Catcha in the database, they're not a player
	if (!otherUserCatcha) {
		return messageResponse({
			embeds: [
				errorEmbed(
					"The user you're trying to trade cannot be found in the bot's database. Maybe they haven't played Catcha before to initialize their data?",
				),
			],
		});
	}

	const userTradeBlock = getCurrentlyTradeBlocked(userCatcha, currentTimeMs);

	if (userTradeBlock.currentlyBlocked) {
		// The user has an active trade block
		const { blockedUntilUnixTime, reason } = userTradeBlock;

		return messageResponse({
			embeds: [
				errorEmbed(
					`You're blocked from trading${blockedUntilUnixTime !== undefined ? ` until <t:${blockedUntilUnixTime}:f>` : ' indefinitely'}.${reason ? ' Reason: ' + reason : ''}`,
				),
			],
		});
	}

	const otherUserTradeBlock = getCurrentlyTradeBlocked(otherUserCatcha, currentTimeMs);

	if (otherUserTradeBlock.currentlyBlocked) {
		// The other user is blocked
		return messageResponse({
			embeds: [errorEmbed("The user you're attempting to trade is currently blocked from trading.")],
		});
	}

	const cooldown = getTradeCooldown(userCatcha, currentUnixTime);

	if (cooldown.isOnCooldown) {
		return messageResponse({
			embeds: [
				errorEmbed(
					`You're on trade cooldown and can trade <t:${cooldown.canTradeAtUnixTime}:R> (at <t:${cooldown.canTradeAtUnixTime}:t>).`,
				),
			],
		});
	}

	const cardsToTrade: CatchaCard[] = [];
	const cardUuidsToTrade: string[] = [];

	const kitsToTrade: Kit[] = [];
	const kitUuidsToTrade: string[] = [];

	if (options.cardPositions.length > 0) {
		const userCollection = await collection.getCollection(userDiscordId, env);

		for (const cardPosition of options.cardPositions) {
			const cardIndex = cardPosition - 1;
			const card = userCollection[cardIndex];

			if (!card) {
				return messageResponse({ embeds: [errorEmbed(`No card found at position ${cardPosition}.`)] });
			}

			// We don't want anyone to find any crazy card duplication exploits so a card can only be in
			// one pending trade at a time.
			if (card.card.pendingTradeUuid1 !== null || card.card.pendingTradeUuid2 !== null) {
				return messageResponse({
					embeds: [
						errorEmbed(
							`The card at position ${cardPosition} is already in another pending trade. Complete or cancel that trade first.`,
						),
					],
				});
			}

			if (card.card.untradeable) {
				return messageResponse({
					embeds: [errorEmbed(`The card at position ${cardPosition} is marked as untradeable.`)],
				});
			}

			cardsToTrade.push(card.card);
			cardUuidsToTrade.push(...cardsToTrade.map((card) => card.uuid)); // We need the UUIDs of the cards to be traded
		}
	}

	if (options.kitsToTrade.length > 0) {
		const nursery = await nurseryManager.getNursery(options.user, env, false);
		const foundKits = nurseryManager.locateKits(nursery, options.kitsToTrade);

		if (foundKits.length === 0) {
			return messageResponse({
				embeds: [errorEmbed("Couldn't find any kits with this input.")],
			});
		}

		for (const kit of foundKits) {
			if (kit.pendingTradeUuid1 !== undefined || kit.pendingTradeUuid2 !== undefined) {
				return messageResponse({
					embeds: [errorEmbed(`${kit.fullName} (${kit.position}) is already in another pending trade.`)],
				});
			}

			if (kit.wanderingSince !== undefined) {
				const pronouns = getPronouns(kit.gender);

				return messageResponse({
					embeds: [
						errorEmbed(
							`You cannot see ${kit.fullName} (${kit.position}) anywhere in the nursery so that you could trade ${pronouns.object}.`,
						),
					],
				});
			}

			kitsToTrade.push(kit);
			kitUuidsToTrade.push(kit.uuid);
		}
	}

	const existingTrades = await tradeDB.findTradesBetweenUsers(
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

			updatedTrade = await tradeDB.updateTrade(env.PRISMA, existingTrade.tradeUuid, {
				recipientCardUuids: cardUuidsToTrade,
				recipientKitUuids: kitUuidsToTrade,
				recipientSideSent: true,
			});
		} else {
			// The user may be trying to update an existing trade request they sent (if they forgot a card for instance)
			senderUser = options.user;
			recipientUser = (await discordUserUtils.discordGetUser(
				discordToken,
				options.otherUserDiscordId,
			)) as DAPI.APIUser;

			updatedTrade = await tradeDB.updateTrade(env.PRISMA, existingTrade.tradeUuid, {
				senderCardUuids: cardUuidsToTrade,
				senderKitUuids: kitUuidsToTrade,
				senderSideSent: true,
			});
		}

		// If both parties have sent their sides, begin the trade confirmation
		if (updatedTrade.senderSideSent && updatedTrade.recipientSideSent) {
			const senderUsername = `${senderUser.username}${senderUser.discriminator === '0' ? '' : `#${senderUser.discriminator}`}`;
			const recipientUsername = `${recipientUser.username}${recipientUser.discriminator === '0' ? '' : `#${recipientUser.discriminator}`}`;

			return tradeConfirmation.createTradeConfirmationResponse(
				updatedTrade,
				senderUser.id,
				senderUsername,
				recipientUser.id,
				recipientUsername,
			);
		} else {
			return messageResponse({
				embeds: [buildTradeRequestEmbed(cardsToTrade, kitsToTrade)],
			});
		}
	} else {
		// Create a brand new trade
		await tradeDB.createTrade(env.PRISMA, {
			senderUserUuid: userCatcha.userUuid,
			recipientUserUuid: otherUserCatcha.userUuid,
			sentCardUuids: cardUuidsToTrade,
			sentKitUuids: kitUuidsToTrade,
		});

		return messageResponse({
			embeds: [buildTradeRequestEmbed(cardsToTrade, kitsToTrade)],
		});
	}
}

const RequestSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Send a trade request to another user.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.User,
				name: 'user',
				description: 'The user to send the request to',
				required: true,
			},

			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'cards',
				description: 'The cards in your collection to trade by position and separated by commas or spaces',
				required: false,
			},
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kits',
				description: 'The kits in your nursery to trade by position or name and separated by commas or spaces',
				required: false,
			},
		],
	},

	async execute(options) {
		// No trades in DMs
		if (options.interaction.channel.type === DAPI.ChannelType.DM) {
			return simpleEphemeralResponse(
				"You cannot trade in the bot's DMs. The other user must be able to see the trade confirmation in order to be able to approve or decline the trade.",
			);
		}

		// Parse all of the options
		const { user: userOption, cards: cardsOption, kits: kitsOption } = parseCommandOptions(options.commandOptions);

		// The user option is the only required option
		if (!userOption || userOption.type !== DAPI.ApplicationCommandOptionType.User)
			return simpleEphemeralResponse('No required `user` option provided.');

		// Ensure the user isn't trying to send a trade request to themself
		if (userOption.value === options.user.id)
			return simpleEphemeralResponse('You cannot send a trade request to yourself.');

		/**
		 * The Discord user ID of the `user` command option.
		 */
		const commandOptionUserId = userOption.value;

		/**
		 * The value of the `cards` option (should be card positions separated by commas).
		 */
		let cardsString: string | undefined;

		if (cardsOption && cardsOption.type === DAPI.ApplicationCommandOptionType.String)
			cardsString = cardsOption.value;

		/**
		 * The value of the `kits` option (should be kit positions or names separated by commas).
		 */
		let kitsString: string | undefined;

		// prettier-ignore
		if (kitsOption && kitsOption.type === DAPI.ApplicationCommandOptionType.String)
			kitsString = kitsOption.value;

		// Turn the string of card positions separated by commas into an array of card positions as numbers
		const cardPositions = parseList(cardsString ?? '', true) as number[];

		// Create an array of kit positions and/or names
		const kitsToTrade = parseList(kitsString ?? '') as string[];

		// Check that there aren't too many cards
		if (cardPositions.length > config.CATCHA_TRADE_MAX_CARDS) {
			return simpleEphemeralResponse(`You can only trade up to ${config.CATCHA_TRADE_MAX_CARDS} cards at once.`);
		}

		// And do the same for kits
		if (kitsToTrade.length > config.CATCHA_TRADE_MAX_KITS) {
			return simpleEphemeralResponse(`You can only trade up to ${config.CATCHA_TRADE_MAX_KITS} kits at once.`);
		}

		// The trade request is valid, process it
		return await processTradeRequest(options.interaction, options.env, options.ctx, {
			user: options.user,
			otherUserDiscordId: commandOptionUserId,
			cardPositions: cardPositions,
			kitsToTrade,
		});
	},
};

export default RequestSubcommand;
