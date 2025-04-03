import * as DAPI from 'discord-api-types/v10'

import { parseCommandOptions } from '@/discord/parse-options'
import { parseList } from '@/utils/parse-list'
import { bot } from '@/bot'
import {
	messageResponse,
	simpleMessageResponse,
	simpleEphemeralResponse,
	embedMessageResponse,
	errorEmbed,
} from '@/discord/responses'
import * as archive from '@/commands/catcha/archive'
import * as collection from '@/commands/catcha/collection'
import { stringifyCollection } from '@/commands/catcha/collection'
import * as catchaDB from '@/db/catcha-db'
import { type Subcommand } from '@/commands'

function resetEmbed(embed: DAPI.APIEmbed) {
	const newEmbed = embed

	newEmbed.title = undefined
	newEmbed.timestamp = undefined
	newEmbed.footer = undefined
	newEmbed.color = undefined

	return newEmbed
}

export default {
	name: 'burn',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'burn',
		description: 'Permanently delete cards from your collection.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'cards',
				description: 'The cards to burn by position (multiple card positions separated by commas)',
				required: true,
			},
		],
	},

	async onApplicationCommand({ interaction, user, options }) {
		const { cards: cardsOption } = parseCommandOptions(options)

		let cardsString = ''

		if (!cardsOption || cardsOption.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse("You haven't provided the cards option.")

		cardsString = cardsOption.value

		if (!cardsString || typeof cardsString !== 'string' || cardsString.trim() === '')
			return simpleEphemeralResponse("You haven't provided the cards option.")

		const cardPositions = parseList(cardsString, true) as number[]

		const userCollection = await collection.getCollection(user.id)
		if (!userCollection || userCollection.length === 0)
			return simpleMessageResponse("You don't have any cards to burn.")

		const cardsToBurn: typeof userCollection = []

		for (const cardPosition of cardPositions) {
			const cardIndex = cardPosition - 1
			const card = userCollection[cardIndex]

			if (!card) return embedMessageResponse(errorEmbed(`There is no card at position ${cardPosition}.`))

			if (card.card.pendingTradeUuid1 !== null || card.card.pendingTradeUuid2 !== null) {
				return embedMessageResponse(errorEmbed(`The card at position ${cardPosition} is in a pending trade.`))
			}

			cardsToBurn.push(card)
		}

		return embedMessageResponse(
			{
				title: 'Are you __really__ sure you wish to __burn these cards__?',

				description: `\`\`\`less\n${stringifyCollection(cardsToBurn).join('\n')}\`\`\``,

				footer: {
					text: 'This action cannot be undone | Confirm within 5 minutes to burn',
				},
				timestamp: new Date().toISOString(),
			},
			false,
			[
				{
					type: DAPI.ComponentType.ActionRow,
					components: [
						{
							type: DAPI.ComponentType.Button,
							custom_id: `catcha/burn/y/${user.id}`,
							style: DAPI.ButtonStyle.Danger,
							label: '🔥 Burn',
						},
						{
							type: DAPI.ComponentType.Button,
							custom_id: `catcha/burn/n/${user.id}`,
							style: DAPI.ButtonStyle.Primary,
							label: '❎ Cancel',
						},
					],
				},
			],
		)
	},

	async onMessageComponent({ interaction, user, parsedCustomId }) {
		const yesOrNo = parsedCustomId[2] as 'y' | 'n'
		const confirmationEmbed = interaction.message.embeds[0]
		const confirmationUserId = parsedCustomId[3]

		if (user.id !== confirmationUserId) return simpleEphemeralResponse('This is not your confirmation.')

		const confirmationTimestamp = confirmationEmbed.timestamp

		if (
			!confirmationTimestamp ||
			Math.floor(new Date().getTime() / 1000) > Math.floor(Date.parse(confirmationTimestamp) / 1000) + 300
		) {
			return messageResponse({
				content: 'This confirmation has expired.',
				embeds: [resetEmbed(confirmationEmbed)],
				components: [],
				update: true,
			})
		}

		if (yesOrNo === 'y') {
			const userCatcha = await catchaDB.findCatcha(bot.prisma, user.id)
			const userCollection = await collection.getCollection(user.id)

			if (!userCatcha || !userCollection || userCollection.length === 0) {
				return messageResponse({
					content: 'Your collection is empty.',
					embeds: [resetEmbed(confirmationEmbed)],
					components: [],
					update: true,
				})
			}

			const collectionString = confirmationEmbed.description!.slice(8, -3)
			const collectionLines = collectionString.split('\n')

			const cardUuidsToBurn: string[] = []
			const cardUuidsToMove: string[] = []

			for (const line of collectionLines) {
				const splitLine = line.split(' ')

				const cardId = Number.parseInt(splitLine[1].replace('[', '').replace(']', '').replace('#', ''))
				const cardPosition = Number.parseInt(splitLine[0].replace('[', '').replace(']', ''))
				const cardIndex = cardPosition - 1

				if (!userCollection[cardIndex] || userCollection[cardIndex].card.cardId !== cardId) {
					return messageResponse({
						content: `A card with ID ${cardId} couldn't be found at position ${cardPosition}.`,
						embeds: [resetEmbed(confirmationEmbed)],
						components: [],
						update: true,
					})
				}

				cardUuidsToBurn.push(userCollection[cardIndex].card.uuid)
			}

			if (cardUuidsToBurn.length > 0) {
				await catchaDB.burnCardUuids(bot.prisma, userCatcha.userUuid, cardUuidsToBurn)
			}

			return messageResponse({
				content: 'Cards successfully burned.',
				embeds: [resetEmbed(confirmationEmbed)],
				components: [],
				update: true,
			})
		} else {
			return messageResponse({
				content: 'Cards not burned.',
				embeds: [resetEmbed(confirmationEmbed)],
				components: [],
				update: true,
			})
		}
	},
} as Subcommand
