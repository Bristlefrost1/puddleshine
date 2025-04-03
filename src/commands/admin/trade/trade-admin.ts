import * as DAPI from 'discord-api-types/v10'

import { parseCommandOptions } from '@/discord/parse-options'
import * as listMessage from '@/discord/list-message'
import { bot } from '@/bot'
import {
	embedMessageResponse,
	errorEmbed,
	simpleEphemeralResponse,
	simpleMessageResponse,
	messageResponse,
} from '@/discord/responses'
import { discordGetUser } from '@/discord/api/discord-user'

import { D1PrismaClient, getUserWithDiscordId } from '@/db/database'
import * as archive from '@/commands/catcha/archive/archive'
import { createStarString } from '@/utils/star-string'

import { AdminAccessLevel } from '../admin'

async function viewTrade(
	interaction: DAPI.APIApplicationCommandInteraction,
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[],
): Promise<DAPI.APIInteractionResponse> {
	const { trade_uuid: tradeUuid } = parseCommandOptions(options)

	if (!tradeUuid || tradeUuid.type !== DAPI.ApplicationCommandOptionType.String)
		return simpleEphemeralResponse('No trade UUID provided.')

	const trade = await bot.prisma.catchaTrade.findUnique({
		where: {
			tradeUuid: tradeUuid.value,
		},
		include: {
			sender: { include: { user: true } },
			recipient: { include: { user: true } },
		},
	})

	if (!trade) return simpleMessageResponse('No trade found with the given UUID.')

	const senderDiscordUser = await discordGetUser({ id: trade.sender.user.discordId, token: bot.env.DISCORD_TOKEN })
	const recipientDiscordUser = await discordGetUser({ id: trade.recipient.user.discordId, token: bot.env.DISCORD_TOKEN })

	const cardsInTrade = await bot.prisma.catchaCardHistoryEvent.findMany({
		where: {
			event: 'TRADE',
			eventDetails: tradeUuid.value,
		},
		include: { card: true },
	})

	const senderCards: string[] = []
	const recipientCards: string[] = []

	for (const card of cardsInTrade) {
		const cardDetails = await archive.getCardDetailsById(card.card.cardId)

		if (cardDetails === undefined) continue

		const cardFullName = archive.getCardFullName({
			card: cardDetails,
			inverted: card.card.isInverted,
			variant: card.card.variant ?? undefined,
		})
		const starString = createStarString(cardDetails.rarity, card.card.isInverted)

		const cardString = `[#${card.card.cardId}] ${cardFullName} ${starString}`

		if (card.userUuid === trade.recipientUserUuid) {
			senderCards.push(cardString)
		} else if (card.userUuid === trade.senderUserUuid) {
			recipientCards.push(cardString)
		}
	}

	let senderCardsString = senderCards.join('\n')
	if (senderCardsString === '') senderCardsString = 'No cards'

	let recipientCardsString = recipientCards.join('\n')
	if (recipientCardsString === '') recipientCardsString = 'No cards'

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
	})
}

async function listTradeHistory(userUuid: string, prisma: D1PrismaClient) {
	const tradeHistory: string[] = []
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
	})

	if (trades.length === 0) return []

	for (const trade of trades) {
		const senderDiscordId = trade.sender.user.discordId
		const recipientDiscordId = trade.recipient.user.discordId
		const tradeUnixTimestamp = Math.floor(trade.tradedCompletedAt!.getTime() / 1000)

		if (userUuid === trade.sender.user.uuid) {
			tradeHistory.push(
				`<t:${tradeUnixTimestamp}:f>: Traded with <@${recipientDiscordId}> [Trade UUID: \`${trade.tradeUuid}\`]`,
			)
		} else {
			tradeHistory.push(
				`<t:${tradeUnixTimestamp}:f>: Traded with <@${senderDiscordId}> [Trade UUID: \`${trade.tradeUuid}\`]`,
			)
		}
	}

	return tradeHistory
}

async function showTradeHistory(
	interaction: DAPI.APIApplicationCommandInteraction,
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[],
): Promise<DAPI.APIInteractionResponse> {
	const { user: userOption } = parseCommandOptions(options)

	if (!userOption || userOption.type !== DAPI.ApplicationCommandOptionType.User)
		return simpleEphemeralResponse('No user option provided')

	const user = await getUserWithDiscordId(bot.prisma, userOption.value)
	if (!user) return simpleMessageResponse('No user found in the database.')

	const tradeHistory = await listTradeHistory(user.uuid, bot.prisma)
	if (tradeHistory.length === 0) return embedMessageResponse(errorEmbed('This user does not have trade history.'))

	const list = listMessage.createListMessage({
		action: 'admin/trade/history',
		listDataString: user.uuid,

		items: tradeHistory,

		title: 'Trade History',
	})

	return messageResponse({
		embeds: [list.embed],
		components: list.scrollActionRow !== undefined ? [list.scrollActionRow] : undefined,
		allowedMentions: {
			users: [],
			roles: [],
		},
	})
}

async function scrollTradeHistory(
	interaction: DAPI.APIMessageComponentInteraction,
	parsedCustomId: string[],
): Promise<DAPI.APIInteractionResponse> {
	const pageData = parsedCustomId[3]
	const userUuid = parsedCustomId[4]

	const tradeHistory = await listTradeHistory(userUuid, bot.prisma)

	if (tradeHistory.length === 0)
		return messageResponse({ embeds: [errorEmbed('This user does not have trade history.')], update: true })

	const newList = listMessage.scrollListMessage({
		action: 'admin/trade/history',
		pageData,
		listDataString: userUuid,

		items: tradeHistory,

		title: 'Trade History',
	})

	return messageResponse({
		embeds: [newList.embed],
		components: newList.scrollActionRow !== undefined ? [newList.scrollActionRow] : undefined,
		update: true,
		allowedMentions: {
			users: [],
			roles: [],
		},
	})
}

export async function handleTradeAdminMessageComponent(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	accessLevel: AdminAccessLevel,
	parsedCustomId: string[],
): Promise<DAPI.APIInteractionResponse> {
	const action = parsedCustomId[2]

	switch (action) {
		case 'history':
			return await scrollTradeHistory(interaction, parsedCustomId)
		default:
			return simpleEphemeralResponse('Something went wrong.')
	}
}

export async function handleTradeAdminCommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	user: DAPI.APIUser,
	accessLevel: AdminAccessLevel,
	subcommand: DAPI.APIApplicationCommandInteractionDataSubcommandOption,
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined,
): Promise<DAPI.APIInteractionResponse> {
	switch (subcommand.name) {
		case 'view':
			return await viewTrade(interaction, options!)
		case 'history':
			return await showTradeHistory(interaction, options!)
		default:
			return simpleEphemeralResponse('Something went wrong.')
	}
}
