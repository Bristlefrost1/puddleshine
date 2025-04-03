import * as DAPI from 'discord-api-types/v10'
import { type HistoryCat as DBHistoryCat } from '@prisma/client'

import * as db from '@/db/database'
import * as historyDB from '@/commands/history/db/history-db'
import { bot } from '@/bot'
import { ClanRank, generateRandomSuffix } from '@/cat'
import { Gender } from '@/cat/gender'
import { type Pelt } from '@/cat/pelts'
import { type Eyes } from '@/cat/eyes'

import * as config from '@/config'

type HistoryCat = {
	uuid: string

	index: number
	position: number

	fullName: string
	prefix: string
	suffix: string

	gender: Gender

	ageMoons: number
	isDead: boolean

	clan?: string
	rank: ClanRank

	pelt?: Pelt
	eyes?: Eyes

	dateStored: Date
}

function calculateAge(historyCat: DBHistoryCat) {
	const ageMoons = historyCat.age

	const currentTimestamp = Math.floor(new Date().getTime() / 1000)
	const ageLastUpdatedAt = Math.floor(historyCat.ageUpdated.getTime() / 1000)
	const secondsSinceLastUpdate = currentTimestamp - ageLastUpdatedAt

	return ageMoons + secondsSinceLastUpdate * config.HISTORY_AGE_PER_SECOND
}

export async function getHistoryCats(discordId: string) {
	const user = await db.getUserWithDiscordId(bot.prisma, discordId)

	if (!user) return []

	const historyCats = await historyDB.findHistoryCats(bot.prisma, user.uuid)
	if (!historyCats || historyCats.length === 0) return []

	const listCats: HistoryCat[] = []
	const apprenticesToPromote: HistoryCat[] = []

	let i = 0
	for (const historyCat of historyCats) {
		const age = historyCat.isDead ? historyCat.age : calculateAge(historyCat)

		const cat: HistoryCat = {
			uuid: historyCat.uuid,

			index: i,
			position: i + 1,

			fullName: historyCat.namePrefix + historyCat.nameSuffix,
			prefix: historyCat.namePrefix,
			suffix: historyCat.nameSuffix,

			gender: (historyCat.gender as Gender) ?? Gender.Other,

			ageMoons: age,
			isDead: historyCat.isDead,

			clan: historyCat.clan !== '' ? historyCat.clan : undefined,
			rank: historyCat.rank as ClanRank,

			pelt: historyCat.pelt ? JSON.parse(historyCat.pelt) : undefined,
			eyes: historyCat.eyes ? JSON.parse(historyCat.eyes) : undefined,

			dateStored: historyCat.dateStored,
		}

		i += 1

		if (cat.rank === ClanRank.WarriorApprentice || cat.rank === ClanRank.MedicineCatApprentice) {
			if (cat.ageMoons >= config.HISTORY_PROMOTE_AGE) {
				let newSuffix = generateRandomSuffix({ historyPromote: true })

				const newRank = cat.rank === ClanRank.MedicineCatApprentice ? ClanRank.MedicineCat : ClanRank.Warrior

				cat.suffix = newSuffix
				cat.fullName = cat.prefix + newSuffix
				cat.rank = newRank

				listCats.push(cat)
				apprenticesToPromote.push(cat)

				continue
			}
		}

		listCats.push(cat)
	}

	if (apprenticesToPromote.length > 0) {
		await historyDB.promoteApprentices(
			bot.prisma,
			apprenticesToPromote.map((apprentice) => {
				return { uuid: apprentice.uuid, newSuffix: apprentice.suffix, newRank: apprentice.rank };
			}),
		)
	}

	return listCats
}
