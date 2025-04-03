import * as DAPI from 'discord-api-types/v10'

import * as catchaDB from '@/db/catcha-db'
import * as archive from '@/commands/catcha/archive'
import * as collection from '@/commands/catcha/collection'
import { bot } from '@/bot'
import { type Subcommand } from '@/commands'
import { findUserWithUuid } from '@/db/database'
import { randomArt, buildArtScrollComponents } from '@/commands/catcha/art'
import { discordGetUser } from '@/discord/api/discord-user'
import { messageResponse, simpleEphemeralResponse, errorEmbed } from '@/discord/responses'

import * as config from '@/config'

async function viewCard(
	user: DAPI.APIUser,
	viewCard: { by: 'position'; userId: string; position: number } | { by: 'uuid'; cardUuid: string },
	update?: boolean,
): Promise<DAPI.APIInteractionResponse> {
	let cardToView: Awaited<ReturnType<typeof catchaDB.findCardByUuid>>
	let username: string | undefined

	if (viewCard.by === 'uuid') {
		const card = await catchaDB.findCardByUuid(bot.prisma, viewCard.cardUuid)

		if (!card) {
			return messageResponse({
				embeds: [errorEmbed(`No card found with the UUID ${viewCard.cardUuid}.`)],
				update,
			})
		}

		cardToView = card

		const cardOwner = await findUserWithUuid(bot.prisma, card.ownerUuid)

		if (cardOwner) {
			const ownerDiscordUser = await discordGetUser({ token: bot.env.DISCORD_TOKEN, id: cardOwner.discordId })

			if (ownerDiscordUser) {
				username = ownerDiscordUser.username
			}
		}
	} else {
		const userCollection = await collection.getCollection(viewCard.userId)

		if (!userCollection) {
			return messageResponse({
				embeds: [errorEmbed(`No card found at position ${viewCard.position}.`)],
				update,
			})
		}

		const card = userCollection[viewCard.position - 1]

		if (!card) {
			return messageResponse({
				embeds: [errorEmbed(`No card found at position ${viewCard.position}.`)],
				update,
			})
		}

		cardToView = card.card

		if (viewCard.userId === user.id) {
			username = user.username
		} else {
			const user = await discordGetUser({ token: bot.env.DISCORD_TOKEN, id: viewCard.userId })

			if (user) {
				username = user.username
			} else {
				username = viewCard.userId
			}
		}
	}

	const cardId = cardToView.cardId
	const cardUuid = cardToView.uuid
	const isInverted = cardToView.isInverted
	const variant = cardToView.variant
	const obtainedAtUnixTime = Math.floor(cardToView.obtainedAt.getTime() / 1000)

	const cardDetails = await archive.getCardDetailsById(cardId) as archive.ArchiveCard

	let variantDataIndex: number | undefined
	let variantDescription: string | undefined

	if (variant) {
		const archiveVariant = archive.getCardVariant(cardDetails, variant)

		if (archiveVariant) {
			variantDataIndex = archiveVariant.index
			variantDescription = archiveVariant.description
		}
	}

	let obtainedFrom = ''
	switch (cardToView.obtainedFrom) {
		case 'ROLL':
			obtainedFrom = 'Rolling'
			break

		case 'TRADE':
			obtainedFrom = 'Trading'
			break

		case 'I':
			obtainedFrom = 'Imported'
			break

		case 'BIRTHDAY':
			obtainedFrom = 'Claimed as a birthday card'
			break

		default:
			obtainedFrom = cardToView.obtainedFrom
	}

	const art = randomArt(cardDetails, isInverted, variant ?? undefined)

	let components: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[] = []
	if (art.totalArt && art.artNumber && art.totalArt > 1) {
		components = buildArtScrollComponents(cardId, art.artNumber, isInverted, variantDataIndex)
	}

	components.push({
		type: DAPI.ComponentType.ActionRow,
		components: [
			{
				type: DAPI.ComponentType.Button,
				custom_id: `catcha/view/history/${cardUuid}`,

				style: DAPI.ButtonStyle.Secondary,
				label: '📜 View Card History',
			},
		],
	})

	return messageResponse({
		embeds: [
			await archive.buildCardEmbed({
				ownerUsername: username,

				cardId,
				cardUuid,
				cardName: archive.getCardShortName({ card: cardDetails, inverted: isInverted, variant: variant ?? undefined, addDisambiguator: true }),
				gender: cardDetails.gender === '' ? 'Unknown' : cardDetails.gender,
				clan: cardDetails.group,
				rarity: cardDetails.rarity,

				isInverted,
				variant: variant ?? undefined,
				variantDescription,

				obtainedFrom,
				obtainedAtUnixTime,

				untradeable: cardToView.untradeable ?? undefined,

				artUrl: art.artUrl,
				artText: art.artText,
			}),
		],
		components: components,
		update,
	})
}

async function viewCardHistory(cardUuid: string): Promise<DAPI.APIInteractionResponse> {
	const title = 'Card History'

	const backButton: DAPI.APIButtonComponent = {
		type: DAPI.ComponentType.Button,
		custom_id: `catcha/view/card/${cardUuid}`,
		style: DAPI.ButtonStyle.Secondary,
		label: '← Back to Card',
	}

	const cardHistoryEvents = await catchaDB.getCardHistoryEvents(bot.prisma, cardUuid)

	if (cardHistoryEvents.length === 0) {
		return messageResponse({
			embeds: [
				{
					title,
					color: config.ERROR_COLOUR,
					description: "This card doesn't have any history to show.",
				},
			],
			components: [
				{
					type: DAPI.ComponentType.ActionRow,
					components: [backButton],
				},
			],
			update: true,
		})
	}

	const historyEventRows: string[] = []

	for (const event of cardHistoryEvents) {
		const discordUserId = event.catcha?.user.discordId
		const eventDate = event.timestamp

		const eventTimestamp = Math.floor(eventDate.getTime() / 1000)

		switch (event.event) {
			case 'CLAIM':
				historyEventRows.push(`<t:${eventTimestamp}:f> - Claimed by <@${discordUserId}>`)
				break

			case 'TRADE':
				historyEventRows.push(`<t:${eventTimestamp}:f> - Traded to <@${discordUserId}>`)
				break

			case 'I':
				historyEventRows.push(`<t:${eventTimestamp}:f> - Imported for <@${discordUserId}>`)
				break

			case 'BIRTHDAY':
				historyEventRows.push(`<t:${eventTimestamp}:f> - Claimed as a birthday card by <@${discordUserId}>`)
				break

			default:
				// Nothing
		}
	}

	const embedColour = archive.getCardColour(
		cardHistoryEvents[0].card.isInverted,
		cardHistoryEvents[0].card.variant !== null,
	)
	const historyString = historyEventRows.slice(0, 10).join('\n')

	return messageResponse({
		embeds: [
			{
				title,
				color: embedColour,
				description: historyString,
			},
		],
		components: [
			{
				type: DAPI.ComponentType.ActionRow,
				components: [backButton],
			},
		],
		allowedMentions: {
			users: [],
			roles: [],
		},
		update: true,
	})
}

export default {
	name: 'view',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'view',
		description: 'View a card in a collection.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.Integer,
				name: 'position',
				description: 'The position of the card to view',
				required: true,
			},
			{
				type: DAPI.ApplicationCommandOptionType.User,
				name: 'user',
				description: 'The user whose collection to view',
				required: false,
			},
		],
	},

	async onApplicationCommand({ user, options }) {
		if (options === undefined) return simpleEphemeralResponse('At least the `position` option is required.')

		let userId = user.id
		let position: number | undefined

		// Parse options
		for (const option of options) {
			switch (option.name) {
				case 'position':
					if (option.type === DAPI.ApplicationCommandOptionType.Integer) position = option.value
					continue

				case 'user':
					if (option.type === DAPI.ApplicationCommandOptionType.User) userId = option.value
					continue

				default:
					continue
			}
		}

		if (position === undefined) return simpleEphemeralResponse("You haven't entered a position.")

		return await viewCard(user, {
			by: 'position',
			userId,
			position,
		})
	},

	async onMessageComponent({ user, parsedCustomId }) {
		const action = parsedCustomId[2]

		if (action === 'card') {
			const cardUuid = parsedCustomId[3]

			return await viewCard(user, { by: 'uuid', cardUuid }, true)
		} else if (action === 'history') {
			const cardUuid = parsedCustomId[3]

			return await viewCardHistory(cardUuid)
		}

		return simpleEphemeralResponse('Unknown interaction.')
	},
} as Subcommand
