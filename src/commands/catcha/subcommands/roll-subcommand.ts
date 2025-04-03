import * as DAPI from 'discord-api-types/v10'

import * as catchaDB from '@/db/catcha-db'
import * as archive from '@/commands/catcha/archive'
import { bot } from '@/bot'
import { type Subcommand } from '@/commands'
import { createStarString } from '@/utils/star-string'
import { randomArt } from '@/commands/catcha/art'
import { embedMessageResponse, errorEmbed, messageResponse, simpleEphemeralResponse } from '@/discord/responses'

import * as randomiser from '@/commands/catcha/rolling/randomiser'
import * as rollCache from '@/commands/catcha/rolling/roll-cache'
import * as rollPeriod from '@/commands/catcha/rolling/roll-period'
import { buildWelcomeEmbed, hasRecentlyClaimed, hasAlreadyRolledMaxTimes } from '@/commands/catcha/rolling/roll-utils'

import * as config from '@/config'

type Catcha = NonNullable<Awaited<ReturnType<typeof catchaDB.findCatcha>>>

function buildRollComponents(options: {
	userId: string
	randomCardId: number
	isInverted: boolean
	variantName?: string
	currentRoll: number
}) {
	const components: DAPI.APIMessageActionRowComponent[] = []

	components.push({
		type: DAPI.ComponentType.Button,
		label: '❤️ Claim',
		style: DAPI.ButtonStyle.Primary,
		custom_id: `catcha/claim/${options.userId},${options.randomCardId},${options.isInverted ? '1' : '0'},${options.variantName ?? ''}`, // userId,cardId,inverted,variant
	})

	if (options.currentRoll < config.CATCHA_MAX_ROLLS || bot.env.ENV === 'dev') {
		components.push({
			type: DAPI.ComponentType.Button,
			label: '🎲 Roll',
			style: DAPI.ButtonStyle.Secondary,
			custom_id: 'catcha/roll',
		})
	}

	return components
}

function buildRollEmbed(options: {
	username: string
	currentRoll: number

	randomCard: archive.ArchiveCard
	isInverted: boolean

	variant?: string
	variantDataIndex?: number

	alreadyInCollection: number

	secondsUntilNextRollPeriod: number
}): DAPI.APIEmbed {
	const cardFullName = archive.getCardFullName({ card: options.randomCard, inverted: options.isInverted, variant: options.variantDataIndex })
	const cardShortName = archive.getCardShortName({ card: options.randomCard, inverted: options.isInverted, variant: options.variantDataIndex, addDisambiguator: true })
	const starString = createStarString(options.randomCard.rarity, options.isInverted)
	const art = randomArt(options.randomCard, options.isInverted, options.variantDataIndex)

	const descriptionLines: string[] = []

	if (options.secondsUntilNextRollPeriod <= 300) {
		// Less than 5 min until the next roll period
		const min = Math.floor(options.secondsUntilNextRollPeriod / 60)
		const sec = options.secondsUntilNextRollPeriod - min * 60
		descriptionLines.push(
			`> The next roll period starts in${min > 0 ? ` ${min}m` : ''}${sec > 0 ? ` ${sec}s` : ''}.`,
		)
	}

	if (options.alreadyInCollection > 0) {
		if (options.alreadyInCollection === 1) {
			descriptionLines.push(`> You already have ${cardShortName} in your collection.`)
		} else {
			descriptionLines.push(
				`> You already have ${options.alreadyInCollection} ${cardShortName}s in your collection.`,
			)
		}
	}

	if (options.isInverted) {
		descriptionLines.push(`> **A rare inverted (flipped) card!**`)
	}

	if (options.variantDataIndex !== undefined) {
		descriptionLines.push(
			`> **A rare ${options.variant} variant of ${archive.getCardShortName({ card: options.randomCard, inverted: false, variant: undefined, addDisambiguator: true })}!**`,
		)

		if (options.randomCard.variants![options.variantDataIndex].description) {
			descriptionLines.push('\n')
			descriptionLines.push(options.randomCard.variants![options.variantDataIndex].description)
		}
	}

	const embedColor = archive.getCardColour(options.isInverted, options.variantDataIndex !== undefined)
	const timestamp = new Date().toISOString()

	return {
		author: { name: options.username },
		title: `${starString} ${cardFullName}`,
		color: embedColor,

		description: descriptionLines.length > 0 ? descriptionLines.join('\n') : undefined,

		image:
			art.artUrl !== undefined ?
				{
					url: art.artUrl,
					width: config.CATCHA_CARD_IMAGE_WIDTH,
				}
			:	undefined,

		footer: {
			text: `Roll ${options.currentRoll}/${config.CATCHA_MAX_ROLLS} | Card ID #${options.randomCard.id} | ${art.artText}`,
		},
		timestamp: timestamp,
	}
}

async function rollCard(
	interaction: DAPI.APIApplicationCommandInteraction | DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser
): Promise<DAPI.APIInteractionResponse> {
	const currentRollPeriod = rollPeriod.getCurrentRollPeriod()
	const nextRollPeriod = currentRollPeriod + 1
	const nextRollPeriodTimestamp = nextRollPeriod * 60 * 60 + rollPeriod.ROLL_PERIOD_EPOCH
	const secondsUntilNextRollPeriod = nextRollPeriodTimestamp - Math.floor(new Date().getTime() / 1000)

	const userCatcha = await catchaDB.findCatcha(bot.prisma, user.id)

	if (!userCatcha) {
		// A new user, initialise their Catcha and send a welcome message
		await catchaDB.initialiseCatchaForUser(bot.prisma, user.id)

		return embedMessageResponse(buildWelcomeEmbed(user.username, user.discriminator))
	}

	// Make sure the user can roll this period
	const { hasClaimedRecently, claimCooldownEnd } = hasRecentlyClaimed(userCatcha, currentRollPeriod)
	const rolledMaxTimes = hasAlreadyRolledMaxTimes(userCatcha, currentRollPeriod)

	if (hasClaimedRecently && bot.env.ENV !== 'dev') {
		return embedMessageResponse(
			errorEmbed(
				`You've recently claimed a card ${user.username} and are now on cooldown. You'll be able to roll again at <t:${claimCooldownEnd}:t>.`,
			),
		)
	}

	if (rolledMaxTimes && bot.env.ENV !== 'dev') {
		return embedMessageResponse(
			errorEmbed(
				`You've already rolled ${config.CATCHA_MAX_ROLLS} times in this roll period, ${user.username}! The next roll period starts at <t:${nextRollPeriodTimestamp}:t>.`,
			),
		)
	}

	// Figure out the current roll
	const currentRoll = userCatcha.lastRollPeriod === currentRollPeriod ? (userCatcha.lastRollCount ?? 0) + 1 : 1

	// Alright, the user can roll. Let's randomize a card for them
	let randomCard: archive.ArchiveCard
	let variant: string | undefined
	let variantDataIndex: number | undefined
	let isInverted: boolean
	let alreadyInCollection: number

	let setRollCache: string | undefined

	const rollFromCache = rollCache.getRollFromCache(userCatcha, currentRoll) // First, check the cache

	if (rollFromCache) {
		randomCard = rollFromCache.randomCard
		variant = rollFromCache.variant
		variantDataIndex = rollFromCache.variantDataIndex
		isInverted = rollFromCache.isInverted
		alreadyInCollection = rollFromCache.alreadyInCollection
	} else {
		const rebuiltCache = await rollCache.generateCache(user.id, userCatcha.userUuid, interaction.guild_id)
		const rollFromRebultCache = rebuiltCache.rolls[currentRoll - 1]

		if (rollFromRebultCache) {
			randomCard = rollFromRebultCache.randomCard
			variant = rollFromRebultCache.variant
			variantDataIndex = rollFromRebultCache.variantDataIndex
			isInverted = rollFromRebultCache.isInverted
			alreadyInCollection = rollFromRebultCache.alreadyInCollection

			setRollCache = JSON.stringify(rebuiltCache)
		} else {
			const newRoll = await rollCache.generateCachedRoll(user.id, interaction.guild_id)

			randomCard = newRoll.randomCard
			variant = newRoll.variant
			variantDataIndex = newRoll.variantDataIndex
			isInverted = newRoll.isInverted
			alreadyInCollection = newRoll.alreadyInCollection
		}
	}

	const rollEmbed = buildRollEmbed({
		username: user.username,
		currentRoll,
		randomCard,
		isInverted,
		variant,
		variantDataIndex,
		alreadyInCollection,
		secondsUntilNextRollPeriod,
	})

	const components = buildRollComponents({
		userId: user.id,
		randomCardId: randomCard.id,
		isInverted,
		variantName: variant,
		currentRoll,
	})

	// Update the user's Catcha to record the roll
	await catchaDB.updateCatcha(bot.prisma, userCatcha.userUuid, {
		lastRollPeriod: currentRollPeriod,
		lastRollCount: currentRoll,
		rollCache: setRollCache,
	})

	return messageResponse({
		embeds: [rollEmbed],
		components: [
			{
				type: DAPI.ComponentType.ActionRow,
				components: components,
			},
		],
	})
}

async function showCachedRoll(
	interaction: DAPI.APIApplicationCommandInteraction,
	user: DAPI.APIUser,
	rollNumber: number,
): Promise<DAPI.APIInteractionResponse> {
	if (rollNumber < 1 || rollNumber > config.CATCHA_MAX_ROLLS)
		return simpleEphemeralResponse(`The roll number must be between 1 and ${config.CATCHA_MAX_ROLLS} inclusive.`)

	const currentRollPeriod = rollPeriod.getCurrentRollPeriod()
	const nextRollPeriod = currentRollPeriod + 1
	const nextRollPeriodTimestamp = nextRollPeriod * 60 * 60 + rollPeriod.ROLL_PERIOD_EPOCH
	const secondsUntilNextRollPeriod = nextRollPeriodTimestamp - Math.floor(new Date().getTime() / 1000)

	const userCatcha = await catchaDB.findCatcha(bot.prisma, user.id)

	if (!userCatcha)
		return simpleEphemeralResponse("You haven't rolled any cards yet. Roll a card using `/catcha roll` first.")

	if (userCatcha.lastRollPeriod !== currentRollPeriod || userCatcha.lastRollCount === null)
		return embedMessageResponse(errorEmbed("You haven't rolled any cards in this roll period."))
	if (rollNumber > userCatcha.lastRollCount)
		return embedMessageResponse(errorEmbed(`You haven't rolled a roll numbered ${rollNumber} yet.`))
	if (!userCatcha.rollCache) return embedMessageResponse(errorEmbed("No rolls to show found in the bot's cache."))

	const cachedRoll = rollCache.getRollFromCache(userCatcha, rollNumber)

	if (!cachedRoll) return embedMessageResponse(errorEmbed("Roll not found in the bot's cache."))

	const rollEmbed = buildRollEmbed({
		username: user.username,
		currentRoll: rollNumber,
		randomCard: cachedRoll.randomCard,
		isInverted: cachedRoll.isInverted,
		variant: cachedRoll.variant,
		variantDataIndex: cachedRoll.variantDataIndex,
		alreadyInCollection: cachedRoll.alreadyInCollection,
		secondsUntilNextRollPeriod,
	})

	const components = buildRollComponents({
		userId: user.id,
		randomCardId: cachedRoll.randomCard.id,
		isInverted: cachedRoll.isInverted,
		variantName: cachedRoll.variant,
		currentRoll: rollNumber,
	})

	return messageResponse({
		embeds: [rollEmbed],
		components: [
			{
				type: DAPI.ComponentType.ActionRow,
				components: components,
			},
		],
	})
}

export default {
	name: 'roll',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'roll',
		description: 'Roll a new card.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.Integer,
				name: 'cached',
				description: "The number of the roll to send from the bot's cache",
				required: false,
			},
		],
	},

	async onApplicationCommand({ interaction, user, options }) {
		let showCachedRollNumbered: number | undefined = undefined

		if (options !== undefined) {
			for (const option of options) {
				switch (option.name) {
					case 'cached':
						if (option.type === DAPI.ApplicationCommandOptionType.Integer) showCachedRollNumbered = option.value
						continue

					default:
						continue
				}
			}
		}

		if (showCachedRollNumbered !== undefined) {
			return await showCachedRoll(interaction, user, showCachedRollNumbered)
		} else {
			return await rollCard(interaction, user)
		}
	},

	async onMessageComponent(options) {
		return await rollCard(options.interaction, options.user)
	},
} as Subcommand
