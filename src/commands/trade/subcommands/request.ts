import * as DAPI from 'discord-api-types/v10'
import { type CatchaCard } from '@prisma/client'

import * as discordUserUtils from '@/discord/api/discord-user'
import { parseList } from '@/utils/parse-list'
import { getPronouns } from '@/cat/gender'
import { bot } from '@/bot'

import * as catchaDB from '@/db/catcha-db'
import * as collection from '@/commands/catcha/collection/collection'
import { stringifyCards } from '@/commands/catcha/collection'
import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import { stringifyKitDescription, stringifyKitStatus } from '@/commands/nursery/nursery-views'
import { type Kit } from '@/commands/nursery/game/kit'

import * as tradeDB from '@/commands/trade/db/trade-db'
import * as tradeConfirmation from '@/commands/trade/confirmation'
import { getCurrentlyTradeBlocked } from '@/commands/trade/restrictions/block'
import { getTradeCooldown } from '@/commands/trade/restrictions/cooldown'

import { parseCommandOptions } from '@/discord/parse-options'
import { messageResponse, simpleEphemeralResponse, errorEmbed } from '@/discord/responses'
import { deferMessage, editInteractionResponse } from '@/discord/responses-deferred'

import { type Subcommand } from '@/commands'

import * as config from '@/config'

const SUBCOMMAND_NAME = 'request'

function buildTradeRequestEmbed(cards: CatchaCard[], kits: Kit[]): DAPI.APIEmbed {
	//const hours = Math.floor(config.CATCHA_TRADE_COOLDOWN / 3600)
	const descriptionLines: string[] = []

	if (cards.length > 0) {
		descriptionLines.push('Cards:')
		descriptionLines.push('```less')
		descriptionLines.push(...stringifyCards(cards))
		descriptionLines.push('```')
	}

	if (kits.length > 0) {
		descriptionLines.push('Kits:')
		descriptionLines.push('```ansi')

		for (const kit of kits) {
			descriptionLines.push(stringifyKitDescription(kit, true))
			descriptionLines.push(stringifyKitStatus(kit, true))
		}

		descriptionLines.push('```')
	}

	if (cards.length === 0 && kits.length === 0) {
		descriptionLines.push('```less')
		descriptionLines.push('Nothing')
		descriptionLines.push('```')
	}

	descriptionLines.push('Have this user trade back to begin the trade confirmation.')

	return {
		title: 'Requested a new trade',
		description: descriptionLines.join('\n'),
		footer: {
			text: `Notice: Trading doesn't have a cooldown but is limited to ${config.CATCHA_TRADE_MAX_CARDS} cards per trade.`,
		},
	}
}

async function processTradeRequest(
	interaction: DAPI.APIApplicationCommandInteraction,
	options: {
		user: DAPI.APIUser
		otherUserDiscordId: string
		cardPositions: number[]
		kitsToTrade: string[]
	},
): Promise<void> {
	// The interaction and Discord tokens
	const interactionToken = interaction.token
	const discordToken = bot.env.DISCORD_TOKEN

	// The time of the trade request
	const currentDate = new Date()
	const currentTimeMs = currentDate.getTime()
	const currentUnixTime = Math.floor(currentTimeMs / 1000)

	/**
	 * The Discord ID of the user that is sending the trade request.
	 */
	const userDiscordId = options.user.id

	/**
	 * The Catcha of the user that is sending the trade request.
	 */
	let userCatcha = await catchaDB.findCatcha(bot.prisma, userDiscordId)

	// The user doesn't have a Catcha so they've never rolled before. Thus, they cannot possibly have any cards to give.
	if (!userCatcha) {
		if (options.cardPositions.length === 0) {
			userCatcha = await catchaDB.initialiseCatchaForUser(bot.prisma, options.user.id)
		} else {
			await editInteractionResponse(interactionToken, messageResponse({
				embeds: [
					errorEmbed("You don't have any cards to trade in your collection.")
				]
			}).data!)

			return
		}
	}

	/**
	 * The Catcha of the other user (the one the trade request is being sent to)
	 */
	const otherUserCatcha = await catchaDB.findCatcha(bot.prisma, options.otherUserDiscordId)

	// Same thing. If they don't have a Catcha in the database, they're not a player
	if (!otherUserCatcha) {
		await editInteractionResponse(interactionToken, messageResponse({
			embeds: [
				errorEmbed("The user you're trying to trade cannot be found in the bot's database. Maybe they haven't played Catcha before to initialise their data?")
			]
		}).data!)

		return
	}

	const userTradeBlock = getCurrentlyTradeBlocked(userCatcha, currentTimeMs)

	if (userTradeBlock.currentlyBlocked) {
		// The user has an active trade block
		const { blockedUntilUnixTime, reason } = userTradeBlock

		await editInteractionResponse(interactionToken, messageResponse({
			embeds: [
				errorEmbed(`You're blocked from trading${blockedUntilUnixTime !== undefined ? ` until <t:${blockedUntilUnixTime}:f>` : ' indefinitely'}.${reason ? ' Reason: ' + reason : ''}`)
			]
		}).data!)

		return
	}

	const otherUserTradeBlock = getCurrentlyTradeBlocked(otherUserCatcha, currentTimeMs)

	if (otherUserTradeBlock.currentlyBlocked) {
		// The other user is blocked
		await editInteractionResponse(interactionToken, messageResponse({
			embeds: [
				errorEmbed("The user you're attempting to trade is currently blocked from trading.")
			]
		}).data!)

		return
	}

	const cooldown = getTradeCooldown(userCatcha, currentUnixTime)

	if (cooldown.isOnCooldown) {
		await editInteractionResponse(interactionToken, messageResponse({
			embeds: [
				errorEmbed(`You're on trade cooldown and can trade <t:${cooldown.canTradeAtUnixTime}:R> (at <t:${cooldown.canTradeAtUnixTime}:t>).`)
			]
		}).data!)

		return
	}

	const cardsToTrade: CatchaCard[] = []
	const cardUuidsToTrade: string[] = []

	const kitsToTrade: Kit[] = []
	const kitUuidsToTrade: string[] = []

	if (options.cardPositions.length > 0) {
		const userCollection = await collection.getCollection(userDiscordId)

		for (const cardPosition of options.cardPositions) {
			const cardIndex = cardPosition - 1
			const card = userCollection[cardIndex]

			if (!card) {
				await editInteractionResponse(interactionToken, messageResponse({
					embeds: [
						errorEmbed(`No card found at position ${cardPosition}.`)
					]
				}).data!)
		
				return
			}

			if (card.card.untradeable) {
				await editInteractionResponse(interactionToken, messageResponse({
					embeds: [
						errorEmbed(`The card at position ${cardPosition} is marked as untradeable.`)
					]
				}).data!)
		
				return
			}

			// We don't want anyone to find any crazy card duplication exploits so a card can only be in
			// one pending trade at a time.
			if (card.card.pendingTradeUuid1 !== null || card.card.pendingTradeUuid2 !== null) {
				if (card.card.pendingTradeUuid1 !== null) {
					await tradeDB.deleteTrade(bot.prisma, card.card.pendingTradeUuid1)
				}

				if (card.card.pendingTradeUuid2 !== null) {
					await tradeDB.deleteTrade(bot.prisma, card.card.pendingTradeUuid2)
				}
			}

			cardsToTrade.push(card.card)
			cardUuidsToTrade.push(...cardsToTrade.map((card) => card.uuid)) // We need the UUIDs of the cards to be traded
		}
	}

	if (options.kitsToTrade.length > 0) {
		const nursery = await nurseryManager.getNursery(options.user, false)
		const foundKits = nurseryManager.locateKits(nursery, options.kitsToTrade)

		if (foundKits.length === 0) {
			await editInteractionResponse(interactionToken, messageResponse({
				embeds: [
					errorEmbed("Couldn't find any kits with this input.")
				]
			}).data!)
	
			return
		}

		for (const kit of foundKits) {
			if (kit.wanderingSince !== undefined) {
				const pronouns = getPronouns(kit.gender)

				await editInteractionResponse(interactionToken, messageResponse({
					embeds: [
						errorEmbed(`You cannot see ${kit.fullName} (${kit.position}) anywhere in the nursery so that you could trade ${pronouns.object}.`)
					]
				}).data!)
		
				return
			}

			if (kit.pendingTradeUuid1 !== undefined || kit.pendingTradeUuid2 !== undefined) {
				if (kit.pendingTradeUuid1 !== undefined) {
					await tradeDB.deleteTrade(bot.prisma, kit.pendingTradeUuid1)
				}

				if (kit.pendingTradeUuid2 !== undefined) {
					await tradeDB.deleteTrade(bot.prisma, kit.pendingTradeUuid2)
				}
			}

			kitsToTrade.push(kit)
			kitUuidsToTrade.push(kit.uuid)
		}
	}

	const existingTrades = await tradeDB.findTradesBetweenUsers(
		bot.prisma,
		userCatcha.userUuid,
		otherUserCatcha.userUuid,
		false,
	)

	// The sender (or side 1) is the one that created the trade request (sent their side first)
	// The recipient (or side 2) is the one that responded to the request

	// If there's an existing trade, update it instead of creating a new one
	if (existingTrades.length > 0) {
		const existingTrade = existingTrades[0]

		let updatedTrade: typeof existingTrade
		let senderUser: DAPI.APIUser
		let recipientUser: DAPI.APIUser

		if (userCatcha.userUuid === existingTrade.recipientUserUuid) {
			// The user is responding to a trade request
			recipientUser = options.user
			senderUser = (await discordUserUtils.discordGetUser({ id: options.otherUserDiscordId, token: discordToken }))!

			updatedTrade = await tradeDB.updateTrade(bot.prisma, existingTrade.tradeUuid, {
				recipientCardUuids: cardUuidsToTrade,
				recipientKitUuids: kitUuidsToTrade,
				recipientSideSent: true,
			})
		} else {
			// The user may be trying to update an existing trade request they sent (if they forgot a card for instance)
			senderUser = options.user
			recipientUser = (await discordUserUtils.discordGetUser({ id: options.otherUserDiscordId, token: discordToken }))!

			updatedTrade = await tradeDB.updateTrade(bot.prisma, existingTrade.tradeUuid, {
				senderCardUuids: cardUuidsToTrade,
				senderKitUuids: kitUuidsToTrade,
				senderSideSent: true,
			})
		}

		// If both parties have sent their sides, begin the trade confirmation
		if (updatedTrade.senderSideSent && updatedTrade.recipientSideSent) {
			const senderUsername = `${senderUser.username}${senderUser.discriminator === '0' ? '' : `#${senderUser.discriminator}`}`
			const recipientUsername = `${recipientUser.username}${recipientUser.discriminator === '0' ? '' : `#${recipientUser.discriminator}`}`

			const tradeConfirmationMessage = tradeConfirmation.createTradeConfirmationResponse(
				updatedTrade,
				senderUser.id,
				senderUsername,
				recipientUser.id,
				recipientUsername,
			)

			await editInteractionResponse(interactionToken, tradeConfirmationMessage.data!)
	
			return
		} else {
			await editInteractionResponse(interactionToken, messageResponse({
				embeds: [
					buildTradeRequestEmbed(cardsToTrade, kitsToTrade)
				]
			}).data!)
	
			return
		}
	} else {
		// Create a brand new trade
		await tradeDB.createTrade(bot.prisma, {
			senderUserUuid: userCatcha.userUuid,
			recipientUserUuid: otherUserCatcha.userUuid,
			sentCardUuids: cardUuidsToTrade,
			sentKitUuids: kitUuidsToTrade,
		})

		await editInteractionResponse(interactionToken, messageResponse({
			embeds: [
				buildTradeRequestEmbed(cardsToTrade, kitsToTrade)
			]
		}).data!)

		return
	}
}

export default {
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

	async onApplicationCommand(options) {
		// No trades in DMs
		if (options.interaction.channel.type === DAPI.ChannelType.DM) {
			return simpleEphemeralResponse(
				"You cannot trade in the bot's DMs. The other user must be able to see the trade confirmation in order to be able to approve or decline the trade.",
			)
		}

		// Parse all of the options
		const { user: userOption, cards: cardsOption, kits: kitsOption } = parseCommandOptions(options.options)

		// The user option is the only required option
		if (!userOption || userOption.type !== DAPI.ApplicationCommandOptionType.User)
			return simpleEphemeralResponse('No required `user` option provided.')

		// Ensure the user isn't trying to send a trade request to themself
		if (userOption.value === options.user.id)
			return simpleEphemeralResponse('You cannot send a trade request to yourself.')

		/**
		 * The Discord user ID of the `user` command option.
		 */
		const commandOptionUserId = userOption.value

		/**
		 * The value of the `cards` option (should be card positions separated by commas).
		 */
		let cardsString: string | undefined

		if (cardsOption && cardsOption.type === DAPI.ApplicationCommandOptionType.String)
			cardsString = cardsOption.value

		/**
		 * The value of the `kits` option (should be kit positions or names separated by commas).
		 */
		let kitsString: string | undefined

		// prettier-ignore
		if (kitsOption && kitsOption.type === DAPI.ApplicationCommandOptionType.String)
			kitsString = kitsOption.value

		// Turn the string of card positions separated by commas into an array of card positions as numbers
		const cardPositions = parseList(cardsString ?? '', true) as number[]

		// Create an array of kit positions and/or names
		const kitsToTrade = parseList(kitsString ?? '') as string[]

		// Check that there aren't too many cards
		if (cardPositions.length > config.CATCHA_TRADE_MAX_CARDS) {
			return simpleEphemeralResponse(`You can only trade up to ${config.CATCHA_TRADE_MAX_CARDS} cards at once.`)
		}

		// And do the same for kits
		if (kitsToTrade.length > config.CATCHA_TRADE_MAX_KITS) {
			return simpleEphemeralResponse(`You can only trade up to ${config.CATCHA_TRADE_MAX_KITS} kits at once.`)
		}

		// The trade request is valid, process it
		bot.ctx.waitUntil(processTradeRequest(options.interaction, {
			user: options.user,
			otherUserDiscordId: commandOptionUserId,
			cardPositions: cardPositions,
			kitsToTrade,
		}))
		
		return deferMessage()
	},
} as Subcommand
