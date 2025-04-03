import * as DAPI from 'discord-api-types/v10'

import { bot } from '@/bot'
import { simpleEphemeralResponse } from '@/discord/responses'
import * as catchaDB from '@/db/catcha-db'
import * as archive from '@/commands/catcha/archive'
import * as rollPeriod from './roll-period'

import * as config from '@/config'

export async function handleClaim(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[]
): Promise<DAPI.APIInteractionResponse> {
	const rollMessage = interaction.message
	const rolledTimestamp = Math.floor(Date.parse(rollMessage.timestamp) / 1000)
	const rolledInPeriod = rollPeriod.getRollPeriodFromUnixTime(rolledTimestamp)
	const currentRollPeriod = rollPeriod.getCurrentRollPeriod()

	const claimData = parsedCustomId[2].split(',') // userId,cardId,inverted,variant
	const rolledByDiscordId = claimData[0]
	const claimedCardId = Number.parseInt(claimData[1])
	const claimedCard = (await archive.getCardDetailsById(claimedCardId))!
	const isClaimInverted = claimData[2] === '1' ? true : false
	const claimedVariant = claimData[3] !== '' ? claimData[3] : null

	// Prevent claiming someone else's rolls or claiming cards from past roll periods
	if (user.id !== rolledByDiscordId)
		return simpleEphemeralResponse('You cannot claim a card rolled by someone else.')
	if (rolledInPeriod !== currentRollPeriod)
		return simpleEphemeralResponse('You cannot claim a card rolled in a different roll period.')

	const userCatcha = await catchaDB.findCatcha(bot.prisma, user.id)

	// This should never happen.
	// There's already a check to prevent you from claiming someone else's rolls
	// and when you roll a user is created.
	if (!userCatcha) throw 'No user found in the DB'

	if (userCatcha.lastClaim && bot.env.ENV !== 'dev') {
		const lastClaimTimestamp = Math.floor(userCatcha.lastClaim.getTime() / 1000)
		const lastClaimRollPeriod = rollPeriod.getRollPeriodFromUnixTime(lastClaimTimestamp)

		if (lastClaimRollPeriod === currentRollPeriod) {
			return simpleEphemeralResponse("You've already claimed a card in this roll period.")
		} else if (lastClaimRollPeriod >= currentRollPeriod - config.CATCHA_CLAIM_COOLDOWN_PERIODS) {
			const cooldownEndPeriod = lastClaimRollPeriod + config.CATCHA_CLAIM_COOLDOWN_PERIODS + 1
			const cooldownEndTimestamp = cooldownEndPeriod * 60 * 60 + rollPeriod.ROLL_PERIOD_EPOCH

			return simpleEphemeralResponse(
				`You've recently claimed a card ${user.username} and are now on cooldown. You'll be able to roll and claim again at <t:${cooldownEndTimestamp}:t>.`,
			)
		}
	}

	const claimTime = new Date()

	await catchaDB.claimCard(bot.prisma, {
		userUuid: userCatcha.userUuid,
		cardId: claimedCardId,
		claimTime,
		isInverted: isClaimInverted,
		variant: claimedVariant,
	})

	return {
		type: DAPI.InteractionResponseType.ChannelMessageWithSource,
		data: {
			content: `You've claimed ${archive.getCardShortName({ card: claimedCard, inverted: isClaimInverted, variant: claimedVariant ?? undefined, addDisambiguator: false })}, <@${user.id}>!`,
		},
	}
}
