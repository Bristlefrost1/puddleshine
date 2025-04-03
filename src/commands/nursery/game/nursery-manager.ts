import * as DAPI from 'discord-api-types/v10'
import { type Nursery as DBNursery, type NurseryKit } from '@prisma/client'

import * as db from '@/db/database'
import * as nurseryDB from '@/commands/nursery/db/nursery-db'
import { bot } from '@/bot'
import { getKit, type Kit } from '@/commands/nursery/game/kit'
import { Season, getCurrentSeason } from './seasons'
import {
	addNewAlertToAlerts,
	addNewAlertToNursery,
	findPromotionAlert,
	NurseryAlert,
	NurseryAlertType,
} from './nursery-alerts'
import { pickRandomWeighted, type WeightedValue } from '@/utils/random-utils'
import { getPronouns } from '@/cat/gender'

import * as config from '@/config'

export type Nursery = {
	uuid: string
	discordId: string
	displayName: string
	isPaused: boolean
	clan?: string
	season: Season

	lastBredAt?: Date
	lastCooledAt?: Date

	food: { food: number; max: number; foodPoints: number; nextFoodPointPercentage: number | undefined }

	alerts: NurseryAlert[]

	kits: Kit[]
	kitsNeedingAttention: Kit[]
}

function getNurseryMetersMax(numberOfKits: number) {
	let maxFood = 5

	if (numberOfKits > 5) maxFood = 6
	if (numberOfKits > 8) maxFood = 7
	if (numberOfKits > 10) maxFood = 8
	if (numberOfKits > 12) maxFood = 9
	if (numberOfKits > 14) maxFood = 10

	return { food: maxFood }
}

function calculateFood(nursery: DBNursery, numberOfKits: number) {
	const foodAtLastUpdate = nursery.food
	const lastUpdated = nursery.foodUpdated
	const currentDate = new Date()

	const max = getNurseryMetersMax(numberOfKits)

	if (foodAtLastUpdate >= max.food) return max.food

	const lastUpdatedTimestamp = Math.floor(lastUpdated.getTime() / 1000)
	const currentTimestamp = Math.floor(currentDate.getTime() / 1000)

	const updatedSecondsAgo = currentTimestamp - lastUpdatedTimestamp

	let secondsToRegnerateAFoodPoint = config.NURSERY_REGENERATE_FOOD_POINT
	if (numberOfKits > 4) secondsToRegnerateAFoodPoint = config.NURSERY_REGENERATE_FOOD_POINT - 90 * numberOfKits
	if (secondsToRegnerateAFoodPoint < 1200) secondsToRegnerateAFoodPoint = 1200

	const regenerated = foodAtLastUpdate + updatedSecondsAgo * (1 / secondsToRegnerateAFoodPoint)

	if (regenerated >= max.food) return max.food

	return regenerated
}

function getFood(nursery: DBNursery, isPaused: boolean, numberOfKits: number) {
	const food = isPaused ? nursery.food : calculateFood(nursery, numberOfKits)
	const foodString = food.toString().split('.')

	const foodPoints = Number.parseInt(foodString[0])

	if (foodString.length === 2) {
		const nextFoodPointPercentage = Number.parseFloat(`0.${foodString[1]}`) * 100

		return { food, foodPoints, nextFoodPointPercentage }
	} else {
		return { food, foodPoints }
	}
}

export async function getNursery(user: DAPI.APIUser, generateEvents?: boolean): Promise<Nursery> {
	const discordId = user.id

	const profile = await db.findProfileWithDiscordId(bot.prisma, discordId)
	const nursery = await nurseryDB.getNursery(bot.prisma, discordId)
	const nurseryKits = await nurseryDB.findKits(bot.prisma, nursery.uuid)

	nurseryKits.sort((a, b) => {
		let compareA: Date
		let compareB: Date

		if (a.adoptedAt === null) {
			compareA = a.bredAt
		} else if (a.adoptedAt.getTime() > a.bredAt.getTime()) {
			compareA = a.adoptedAt
		} else {
			compareA = a.bredAt
		}

		if (b.adoptedAt === null) {
			compareB = b.bredAt
		} else if (b.adoptedAt.getTime() > b.bredAt.getTime()) {
			compareB = b.adoptedAt
		} else {
			compareB = b.bredAt
		}

		return compareA.getTime() - compareB.getTime()
	})

	let displayName = user.username
	if (profile && profile.name) displayName = profile.name

	const food = getFood(nursery, nursery.isPaused, nurseryKits.length)
	const alerts = (JSON.parse(nursery.alerts) as NurseryAlert[]).toSorted((a, b) => b.timestamp - a.timestamp)
	let updateAlerts = false

	const kits: Kit[] = []
	const kitsNeedingAttention: Kit[] = []
	const deadKits: Kit[] = []

	const sickKits: Kit[] = []
	const wanderingKits: Kit[] = []

	let kitIndex = 0

	for (const nurseryKit of nurseryKits) {
		const kit = getKit(nurseryKit, kitIndex, nursery.isPaused)
		const pronouns = getPronouns(kit.gender)

		if (kit.isDead && bot.env.ENV !== 'dev') {
			addNewAlertToAlerts(alerts, NurseryAlertType.KitDied, `${kit.fullName} has died.`)
			deadKits.push(kit)
		} else {
			let needsAttention = false

			if (nursery.isPaused) generateEvents = false

			if (generateEvents && kit.sickSince === undefined && kit.wanderingSince === undefined) {
				const eventOdds: WeightedValue<'sick' | 'wander' | 'none'>[] = [
					{ value: 'wander', probability: config.NURSERY_WANDER_CHANCE },
					{ value: 'sick', probability: config.NURSERY_SICK_CHANCE },
					{ value: 'none', probability: '*' },
				]

				const event = pickRandomWeighted(eventOdds)

				if (event === 'sick') {
					addNewAlertToAlerts(
						alerts,
						NurseryAlertType.Sick,
						`${kit.fullName} isn't feeling well. Try taking ${pronouns.object} to the [medicine] cat.`,
					);
					updateAlerts = true

					kit.sickSince = new Date()
					sickKits.push(kit)
				} else if (event === 'wander') {
					const shouldWander: WeightedValue<boolean>[] = [
						{ value: false, probability: kit.bond / 1.5 },
						{ value: true, probability: '*' },
					]

					if (pickRandomWeighted(shouldWander)) {
						addNewAlertToAlerts(
							alerts,
							NurseryAlertType.Wandering,
							`Wait...? Where did ${kit.fullName} go?`,
						)
						updateAlerts = true

						kit.wanderingSince = new Date()
						wanderingKits.push(kit)
					}
				}
			}

			if (kit.age >= config.NURSERY_PROMOTE_AGE) {
				needsAttention = true

				if (!findPromotionAlert(alerts, kit.uuid)) {
					addNewAlertToAlerts(
						alerts,
						NurseryAlertType.Promote,
						`${kit.fullName} wants to become an apprentice.`,
						undefined,
						kit.uuid,
					)

					updateAlerts = true
				}
			}

			if (kit.sickSince !== undefined) needsAttention = true

			kits.push(kit)
			if (needsAttention) kitsNeedingAttention.push(kit)

			kitIndex++
		}
	}

	if (deadKits.length >= 1) {
		await nurseryDB.kitsDied(bot.prisma, nursery.uuid, profile?.group ?? '', deadKits, JSON.stringify(alerts))
	}

	if (sickKits.length >= 1) {
		await nurseryDB.setKitsSickSince(bot.prisma, sickKits, new Date())
	}

	if (wanderingKits.length >= 1) {
		await nurseryDB.setKitsWanderingSince(bot.prisma, wanderingKits, new Date())
	}

	if (updateAlerts) {
		await nurseryDB.updateNurseryAlerts(bot.prisma, nursery.uuid, JSON.stringify(alerts))
	}

	return {
		uuid: nursery.uuid,
		discordId: nursery.user.discordId,
		displayName,
		isPaused: nursery.isPaused,
		clan: profile?.group ?? undefined,
		season: getCurrentSeason(),

		lastBredAt: nursery.lastBredAt ?? undefined,
		lastCooledAt: nursery.lastCooledAt ?? undefined,

		food: {
			food: food.food,
			max: getNurseryMetersMax(kits.length).food,
			foodPoints: food.foodPoints,
			nextFoodPointPercentage: food.nextFoodPointPercentage,
		},

		alerts: alerts,

		kits: kits,
		kitsNeedingAttention,
	}
}

export function locateKits(nursery: Nursery, kitsToLocate: string[]) {
	const foundKits: Kit[] = []

	if (nursery.kits.length === 0 || kitsToLocate.length === 0) return []

	if (kitsToLocate[0].toLowerCase() === 'all') {
		foundKits.push(...nursery.kits)

		return foundKits
	}

	for (const kit of kitsToLocate) {
		const kitPosition = Number.parseInt(kit)

		if (!isNaN(kitPosition)) {
			if (nursery.kits[kitPosition - 1]) foundKits.push(nursery.kits[kitPosition - 1])
		} else {
			const lowercaseName = kit.toLowerCase()

			const filterResult = nursery.kits.filter(
				(nurseryKit) =>
					nurseryKit.prefix.toLowerCase() === lowercaseName ||
					nurseryKit.fullName.toLowerCase() === lowercaseName,
			)

			if (filterResult.length > 0) foundKits.push(...filterResult)
		}
	}

	return foundKits
}
