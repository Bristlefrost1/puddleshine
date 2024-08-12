import * as DAPI from 'discord-api-types/v10';

import { parseCommandOptions } from '#discord/parse-options.js';
import * as listMessage from '#discord/list-message.js';
import {
	embedMessageResponse,
	errorEmbed,
	simpleEphemeralResponse,
	simpleMessageResponse,
	messageResponse,
} from '#discord/responses.js';
import { discordGetUser } from '#discord/api/discord-user.js';

import { D1PrismaClient, getUserWithDiscordId } from '#db/database.js';
import * as archive from '#commands/catcha/archive/archive.js';
import { createStarString } from '#commands/catcha/utils/star-string.js';

import { AdminAccessLevel } from '../admin.js';

async function viewTrade(
	interaction: DAPI.APIApplicationCommandInteraction,
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	env: Env,
): Promise<DAPI.APIInteractionResponse> {
	const { trade_uuid: tradeUuid } = parseCommandOptions(options);

	if (!tradeUuid || tradeUuid.type !== DAPI.ApplicationCommandOptionType.String)
		return simpleEphemeralResponse('No trade UUID provided.');

	const trade = await env.PRISMA.catchaTrade.findUnique({
		where: {
			tradeUuid: tradeUuid.value,
		},
		include: {
			sender: { include: { user: true } },
			recipient: { include: { user: true } },
		},
	});

	if (!trade) return simpleMessageResponse('No trade found with the given UUID.');

	const senderDiscordUser = await discordGetUser(env.DISCORD_TOKEN, trade.sender.user.discordId);
	const recipientDiscordUser = await discordGetUser(env.DISCORD_TOKEN, trade.recipient.user.discordId);

	const cardsInTrade = await env.PRISMA.catchaCardHistoryEvent.findMany({
		where: {
			event: 'TRADE',
			eventDetails: tradeUuid.value,
		},
		include: { card: true },
	});

	const senderCards: string[] = [];
	const recipientCards: string[] = [];

	for (const card of cardsInTrade) {
		const cardDetails = archive.getCardDetailsById(card.card.cardId)!;
		const cardFullName = archive.getCardFullName(
			card.card.cardId,
			card.card.isInverted,
			card.card.variant ?? undefined,
		);
		const starString = createStarString(cardDetails.rarity, card.card.isInverted);

		const cardString = `[#${card.card.cardId}] ${cardFullName} ${starString}`;

		if (card.userUuid === trade.recipientUserUuid) {
			senderCards.push(cardString);
		} else if (card.userUuid === trade.senderUserUuid) {
			recipientCards.push(cardString);
		}
	}

	let senderCardsString = senderCards.join('\n');
	if (senderCardsString === '') senderCardsString = 'No cards';

	let recipientCardsString = recipientCards.join('\n');
	if (recipientCardsString === '') recipientCardsString = 'No cards';

	return messageResponse({
		embeds: [
			{
				title: `Trade ${tradeUuid.value}`,
				fields: [
					{
						name: `${senderDiscordUser?.username ?? trade.sender.user.discordId}`,
						value: `\`\`\`less\n${senderCardsString}\`\`\``,
						inline: true,
					},
					{
						name: `${recipientDiscordUser?.username ?? trade.recipient.user.discordId}`,
						value: `\`\`\`less\n${recipientCardsString}\`\`\``,
						inline: true,
					},
				],
				footer: { text: 'Traded at' },
				timestamp: trade.tradedCompletedAt!.toISOString(),
			},
		],
	});
}

async function listTradeHistory(userUuid: string, prisma: D1PrismaClient) {
	const tradeHistory: string[] = [];
	const trades = await prisma.catchaTrade.findMany({
		where: {
			OR: [{ senderUserUuid: userUuid }, { recipientUserUuid: userUuid }],
			tradeCompleted: true,
		},
		include: {
			sender: { include: { user: true } },
			recipient: { include: { user: true } },
		},
		orderBy: {
			tradedCompletedAt: 'desc',
		},
	});

	if (trades.length === 0) return [];

	for (const trade of trades) {
		const senderDiscordId = trade.sender.user.discordId;
		const recipientDiscordId = trade.recipient.user.discordId;
		const tradeUnixTimestamp = Math.floor(trade.tradedCompletedAt!.getTime() / 1000);

		if (userUuid === trade.sender.user.uuid) {
			tradeHistory.push(
				`<t:${tradeUnixTimestamp}:f>: Traded with <@${recipientDiscordId}> [Trade UUID: \`${trade.tradeUuid}\`]`,
			);
		} else {
			tradeHistory.push(
				`<t:${tradeUnixTimestamp}:f>: Traded with <@${senderDiscordId}> [Trade UUID: \`${trade.tradeUuid}\`]`,
			);
		}
	}

	return tradeHistory;
}

async function showTradeHistory(
	interaction: DAPI.APIApplicationCommandInteraction,
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	env: Env,
): Promise<DAPI.APIInteractionResponse> {
	const { user: userOption } = parseCommandOptions(options);

	if (!userOption || userOption.type !== DAPI.ApplicationCommandOptionType.User)
		return simpleEphemeralResponse('No user option provided');

	const user = await getUserWithDiscordId(env.PRISMA, userOption.value);
	if (!user) return simpleMessageResponse('No user found in the database.');

	const tradeHistory = await listTradeHistory(user.uuid, env.PRISMA);
	if (tradeHistory.length === 0) return embedMessageResponse(errorEmbed('This user does not have trade history.'));

	const list = listMessage.createListMessage({
		action: 'admin/trade/history',
		listDataString: user.uuid,

		items: tradeHistory,

		title: 'Trade History',
	});

	return messageResponse({
		embeds: [list.embed],
		components: list.scrollActionRow !== undefined ? [list.scrollActionRow] : undefined,
		allowedMentions: {
			users: [],
			roles: [],
		},
	});
}

async function scrollTradeHistory(
	interaction: DAPI.APIMessageComponentInteraction,
	parsedCustomId: string[],
	env: Env,
): Promise<DAPI.APIInteractionResponse> {
	const pageData = parsedCustomId[3];
	const userUuid = parsedCustomId[4];

	const tradeHistory = await listTradeHistory(userUuid, env.PRISMA);

	if (tradeHistory.length === 0)
		return messageResponse({ embeds: [errorEmbed('This user does not have trade history.')], update: true });

	const newList = listMessage.scrollListMessage({
		action: 'admin/trade/history',
		pageData,
		listDataString: userUuid,

		items: tradeHistory,

		title: 'Trade History',
	});

	return messageResponse({
		embeds: [newList.embed],
		components: newList.scrollActionRow !== undefined ? [newList.scrollActionRow] : undefined,
		update: true,
		allowedMentions: {
			users: [],
			roles: [],
		},
	});
}

async function handleTradeAdminMessageComponent(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	accessLevel: AdminAccessLevel,
	parsedCustomId: string[],
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const action = parsedCustomId[2];

	switch (action) {
		case 'history':
			return await scrollTradeHistory(interaction, parsedCustomId, env);
		default:
			return simpleEphemeralResponse('Something went wrong.');
	}
}

async function handleTradeAdminCommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	user: DAPI.APIUser,
	accessLevel: AdminAccessLevel,
	subcommand: DAPI.APIApplicationCommandInteractionDataSubcommandOption,
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	switch (subcommand.name) {
		case 'view':
			return await viewTrade(interaction, options!, env);
		case 'history':
			return await showTradeHistory(interaction, options!, env);
		default:
			return simpleEphemeralResponse('Something went wrong.');
	}
}

export { handleTradeAdminCommand, handleTradeAdminMessageComponent };
