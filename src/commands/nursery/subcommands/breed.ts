import * as DAPI from 'discord-api-types/v10'

import { KitGender } from '@/cat/gender'
import { type Pelt, PeltColour, PeltType, randomisePelt } from '@/cat/pelts'
import { type Eyes, randomiseEyes } from '@/cat/eyes'

import * as nurseryDB from '@/commands/nursery/db/nursery-db'
import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import * as nurseryViews from '@/commands/nursery/nursery-views'

import { bot } from '@/bot'
import * as randomUtils from '@/utils/random-utils'
import { type WeightedValue } from '@/utils/random-utils'
import { generateRandomPrefix } from '@/cat'

import { type Subcommand } from '@/commands'

import * as config from '@/config'

const SUBCOMMAND_NAME = 'breed'

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Try to breed for kits.',

		options: [],
	},

	async onApplicationCommand(options) {
		let nursery = await nurseryManager.getNursery(options.user)

		if (nursery.isPaused)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ['Your nursery is currently paused.'],
			})

		const breedTime = new Date()
		const breedTimestamp = Math.floor(breedTime.getTime() / 1000)

		if (nursery.lastBredAt) {
			const lastBreedTimestamp = Math.floor(nursery.lastBredAt.getTime() / 1000)
			const canBreedAt = lastBreedTimestamp + config.NURSERY_BREED_COOLDOWN

			if (canBreedAt > breedTimestamp && bot.env.ENV !== 'dev') {
				return nurseryViews.nurseryMessageResponse(nursery, {
					view: 'home',
					messages: [`You can next breed on <t:${canBreedAt}:F> (<t:${canBreedAt}:R>).`],
				})
			}
		}

		let numberOfKits = 1

		if (nursery.kits.length > 1) {
			const noKitsOdds: WeightedValue<boolean>[] = [
				{ value: true, probability: config.NURSERY_NO_KITS_BREED_CHANCE },
				{ value: false, probability: '*' },
			]

			if (randomUtils.pickRandomWeighted(noKitsOdds)) numberOfKits = 0
		}

		if (numberOfKits === 0)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ['There were no kits this time.'],
			})

		const numberOfKitsOdds: WeightedValue<number>[] = [
			{ value: 1, probability: config.NURSERY_1_KIT_CHANCE },
			{ value: 2, probability: config.NURSERY_2_KITS_CHANCE },
			{ value: 3, probability: config.NURSERY_3_KITS_CHANCE },
			{ value: 4, probability: config.NURSERY_4_KITS_CHANCE },
		]

		numberOfKits = randomUtils.pickRandomWeighted(numberOfKitsOdds)

		const bredKits: {
			prefix: string
			gender: KitGender
			pelt: Pelt
			eyes: Eyes
		}[] = []

		const kitNames: string[] = []

		for (let i = 0; i < numberOfKits; i++) {
			const prefix = generateRandomPrefix()
			const kitPelt = randomisePelt()
			const kitEyes = randomiseEyes()

			let sheKitProbability = 0.5

			if (kitPelt.type === PeltType.SolidColor || kitPelt.type === PeltType.Tabby) {
				if (kitPelt.colour === PeltColour.Orange || kitPelt.colour === PeltColour.Ginger) {
					sheKitProbability = 0.2
				}
			} else if (kitPelt.type === PeltType.Calico) {
				sheKitProbability = 1 - 0.00033
			}

			const genderOdds: WeightedValue<KitGender>[] = [
				{ value: KitGender.SheKit, probability: sheKitProbability },
				{ value: KitGender.TomKit, probability: '*' },
			]

			const gender = randomUtils.pickRandomWeighted(genderOdds)

			kitNames.push(`${prefix}kit`)
			bredKits.push({ prefix, gender, pelt: kitPelt, eyes: kitEyes })
		}

		await nurseryDB.breedForKits(bot.prisma, nursery.uuid, breedTime, bredKits)

		let kitsString = ''

		if (kitNames.length === 1) {
			kitsString = kitNames[0]
		} else if (kitNames.length === 2) {
			kitsString = `${kitNames[0]} and ${kitNames[1]}`
		} else if (kitNames.length >= 3) {
			const last = kitNames.pop()

			kitsString = kitNames.join(', ')
			kitsString += `, and ${last}`
		}

		let numberString = ''

		switch (numberOfKits) {
			case 1:
				numberString = 'one kit'
				break

			case 2:
				numberString = 'two kits'
				break

			case 3:
				numberString = 'three kits'
				break

			case 4:
				numberString = 'four kits'
				break

			default:
				numberString = `${numberOfKits.toString()} kits`
		}

		// Refresh the nursery
		nursery = await nurseryManager.getNursery(options.user)

		return nurseryViews.nurseryMessageResponse(nursery, {
			view: 'home',
			messages: [`There was a litter of ${numberString}: ${kitsString}`],
		})
	},
} as Subcommand
