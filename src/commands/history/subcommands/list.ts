import * as DAPI from 'discord-api-types/v10'

import * as listMessage from '@/discord/list-message'
import { parseCommandOptions } from '@/discord/parse-options'
import { messageResponse, embedMessageResponse, errorEmbed } from '@/discord/responses'

import { getHistoryCats } from '@/commands/history/history-cat/history-cat'

import { type Subcommand } from '@/commands/command'

const SUBCOMMAND_NAME = 'list'

async function listHistoryCats(discordUserId: string): Promise<string[]> {
	const returnArray: string[] = []
	const historyCats = await getHistoryCats(discordUserId)

	if (historyCats.length === 0) return []

	for (const historyCat of historyCats) {
		let gender = historyCat.gender.toLowerCase()
		if (gender === '') gender = 'cat'

		if (historyCat.isDead) {
			returnArray.push(
				`[${historyCat.position}] ${historyCat.fullName}, a ${gender}, died at ${Math.floor(historyCat.ageMoons)} moons`,
			)
		} else {
			returnArray.push(
				`[${historyCat.position}] ${historyCat.fullName}, a ${gender}, is ${Math.floor(historyCat.ageMoons)} moons`,
			)
		}
	}

	return returnArray
}

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'List the cats in your history.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.User,
				name: 'user',
				description: "The user whose list you'd like to view",

				required: false,
			},
		],
	},

	async onApplicationCommand({ interaction, user, options }) {
		let listUserId = user.id
		const { user: userOption } = parseCommandOptions(options)

		if (userOption && userOption.type === DAPI.ApplicationCommandOptionType.User) {
			listUserId = userOption.value
		}

		const listOfCats = await listHistoryCats(listUserId)

		if (listOfCats.length === 0) {
			if (listUserId === user.id) {
				return embedMessageResponse(errorEmbed('Nothing found in your history.'))
			} else {
				return embedMessageResponse(errorEmbed("Nothing found in this user's history."))
			}
		}

		const list = listMessage.createListMessage({
			action: 'history/list',
			listDataString: listUserId,

			items: listOfCats,

			title: 'History',
		})

		return messageResponse({
			embeds: [list.embed],
			components: list.scrollActionRow ? [list.scrollActionRow] : undefined,
			allowedMentions: {
				users: [],
				roles: [],
			},
		})
	},

	async onMessageComponent({ interaction, user, parsedCustomId }) {
		const pageData = parsedCustomId[2]
		const discordId = parsedCustomId[3]

		const listOfCats = await listHistoryCats(discordId)

		const newList = listMessage.scrollListMessage({
			action: 'history/list',
			pageData,
			listDataString: discordId,

			items: listOfCats,

			title: 'History',
		})

		return messageResponse({
			embeds: [newList.embed],
			components: newList.scrollActionRow ? [newList.scrollActionRow] : undefined,
			allowedMentions: {
				users: [],
				roles: [],
			},
			update: true,
		})
	},
} as Subcommand
