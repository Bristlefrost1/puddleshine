import * as DAPI from 'discord-api-types/v10'

import { simpleEphemeralResponse } from '@/discord/responses'
import { parseCommandOptions } from '@/discord/parse-options'
import { parseList } from '@/utils/parse-list'
import { getPronouns } from '@/cat/gender'
import { ClanRank } from '@/cat'
import { bot } from '@/bot'
import * as randomUtils from '@/utils/random-utils'

import * as nurseryDB from '@/commands/nursery/db/nursery-db'
import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import * as nurseryViews from '@/commands/nursery/nursery-views'

import { type Subcommand } from '@/commands'
import { type WeightedValue } from '@/utils/random-utils'

import * as config from '@/config'

const SUBCOMMAND_NAME = 'promote'

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: `Promote a kit when it has reached the age of ${config.NURSERY_PROMOTE_AGE} moons.`,

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kit',
				description: 'The kit to promote by name or position',
				required: true,
			},
		],
	},

	async onApplicationCommand(options) {
		const nursery = await nurseryManager.getNursery(options.user)

		if (nursery.isPaused) {
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ['Your nursery is currently paused.'],
			})
		}

		const { kit: kitOption } = parseCommandOptions(options.options)

		if (!kitOption || kitOption.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No kit option provided.')

		const kitNames = parseList(kitOption.value) as string[]
		const foundKits = nurseryManager.locateKits(nursery, kitNames)

		if (foundKits.length < 1)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ["Couldn't find a kit with the provided input."],
			})

		const kit = foundKits[0]

		if (kit.wanderingSince !== undefined)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: [`You can't see ${kit.fullName} anywhere in the nursery for the apprentice ceremony.`],
			})

		if (kit.age < config.NURSERY_PROMOTE_AGE)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: [`${kit.fullName} hasn't reached the age of ${config.NURSERY_PROMOTE_AGE} moons yet.`],
			})

		// Alright, the kit is old enough, promotion time
		const rankOdds: WeightedValue<ClanRank.MedicineCatApprentice | ClanRank.WarriorApprentice>[] = [
			{ value: ClanRank.MedicineCatApprentice, probability: 0.2 },
			{ value: ClanRank.WarriorApprentice, probability: '*' },
		]

		const clan = nursery.clan ?? ''
		const apprenticeRank = randomUtils.pickRandomWeighted(rankOdds)

		const pronouns = getPronouns(kit.gender)
		const apprenticeName = kit.prefix + 'paw'

		await nurseryDB.promoteKit(bot.prisma, nursery.uuid, kit, { clan, apprenticeRank })

		nursery.kits = nursery.kits.filter((nurseryKit) => nurseryKit.position !== kit.position)
		nursery.kits = nursery.kits.map((nurseryKit, index) => {
			const kitData = nurseryKit

			kitData.index = index
			kitData.position = index + 1

			return kitData
		})

		let promotionMessage: string[] = []

		if (apprenticeRank === ClanRank.MedicineCatApprentice) {
			promotionMessage = [
				`It has become time for ${kit.fullName}'s apprentice ceremony. However, ${pronouns.subject} says ${pronouns.subject} would like to become a medicine cat instead of a warrior. You agree, having noticed your kits connection to StarClan from a young age.`,
				`You follow ${kit.fullName} out of the den to the medicine den where the Clan's medicine cat takes ${pronouns.object} as their apprentice. The leader calls a Clan meeting and ${kit.fullName} is assigned to the Clan's medicine cat. Soon, it's time for ${apprenticeName}'s first half-moon meeting where ${pronouns.subject} is presented to StarClan as a medicine cat apprentice.`,
				`"${apprenticeName}! ${apprenticeName}! ${apprenticeName}!"`,
			]
		} else {
			promotionMessage = [
				`It has become time for ${kit.fullName}'s apprentice ceremony. You tell ${pronouns.object} about it and ${pronouns.subject} dashes out of the den with glowing eyes and in excitement.`,
				`You follow ${kit.fullName} out of the den to the Clan leader's yowls to gather for a Clan meeting. You watch as the leader calls ${pronouns.object} over and assigns ${pronouns.object} to a worthy mentor.`,
				`"${apprenticeName}! ${apprenticeName}! ${apprenticeName}!"`,
			]
		}

		return nurseryViews.nurseryMessageResponse(nursery, {
			view: 'home',
			messages: promotionMessage,
		})
	},
} as Subcommand
