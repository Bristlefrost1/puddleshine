import * as DAPI from 'discord-api-types/v10'

import * as catchaDB from '@/db/catcha-db'
import * as config from '@/config'
import { ROLL_PERIOD_EPOCH, getRollPeriodFromUnixTime } from './roll-period'

type Catcha = NonNullable<Awaited<ReturnType<typeof catchaDB.findCatcha>>>

export function buildWelcomeEmbed(username: string, discriminator: string): DAPI.APIEmbed {
	return {
		color: config.INFO_COLOUR,
		description: `Welcome to Catcha, ${username}${discriminator === '0' ? '' : '#' + discriminator}! If you need help, join the Puddleshine Community Discord in the bot's about me. Start by resending the command.`,
	}
}

export function hasRecentlyClaimed(catcha: Catcha, currentRollPeriod: number) {
	if (!catcha.lastClaim) return { hasClaimedRecently: false, claimCooldownEnd: undefined }

	const lastClaimTimestamp = Math.floor(catcha.lastClaim.getTime() / 1000)
	const lastClaimRollPeriod = getRollPeriodFromUnixTime(lastClaimTimestamp)

	if (lastClaimRollPeriod >= currentRollPeriod - config.CATCHA_CLAIM_COOLDOWN_PERIODS) {
		const cooldownEndPeriod = lastClaimRollPeriod + config.CATCHA_CLAIM_COOLDOWN_PERIODS + 1
		const cooldownEndUnixTime = cooldownEndPeriod * 60 * 60 + ROLL_PERIOD_EPOCH

		return {
			hasClaimedRecently: true,
			claimCooldownEnd: cooldownEndUnixTime,
		}
	}

	return { hasClaimedRecently: false, claimCooldownEnd: undefined }
}

export function hasAlreadyRolledMaxTimes(catcha: Catcha, currentRollPeriod: number) {
	if (catcha.lastRollPeriod === currentRollPeriod) {
		if (catcha.lastRollCount && catcha.lastRollCount >= config.CATCHA_MAX_ROLLS) {
			return true
		}
	}

	return false
}
