import * as DAPI from 'discord-api-types/v10'

import * as clanNames from '@/cat/clan-names'
import { messageResponse } from '@/discord/responses'

import { type Command } from '../command'

export default {
	name: 'name',

	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'name',
		description: 'Commands for working with Clan names.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall, DAPI.ApplicationIntegrationType.UserInstall],
		contexts: [
			DAPI.InteractionContextType.Guild,
			DAPI.InteractionContextType.BotDM,
			DAPI.InteractionContextType.PrivateChannel,
		],

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: 'validate',
				description: 'Check if a given name is a valid Clan name.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.String,
						name: 'name',
						description: 'The name to be validated',
						required: true,
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: 'inspect_affix',
				description: 'See if an affix is a canonically-valid prefix or a suffix.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.String,
						name: 'affix',
						description: 'The affix to be checked',
						required: true,
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: 'generate',
				description: 'Generate a random Clan name.',
			},
		],
	},

	async onApplicationCommand({ interaction, user, subcommandGroup, subcommand, options }) {
		if (!subcommand) return

		if (subcommand.name === 'validate') {
			const nameOption = options![0].value as string

			const firstCharacter = nameOption.slice(undefined, 1).toLocaleUpperCase('en')
			const rest = nameOption.slice(1).toLocaleLowerCase('en')

			const name = firstCharacter + rest

			if (clanNames.validateName(name)) {
				return messageResponse({
					content: `${name} is a valid Clan name.`,
					allowedMentions: {
						users: [],
						roles: [],
					},
				})
			} else {
				return messageResponse({
					content: `${name} is not a valid Clan name.`,
					allowedMentions: {
						users: [],
						roles: [],
					},
				})
			}
		} else if (subcommand.name === 'generate') {
			const randomName = clanNames.generateRandomName()

			return messageResponse({
				content: `Generated a random Clan name: ${randomName}`,
			})
		} else if (subcommand.name === 'inspect_affix') {
			const affix = options![0].value as string

			let isAValidPrefix = false
			let isAValidSuffix = false

			for (const prefix of clanNames.prefixes) {
				if (prefix.toLowerCase() === affix.toLowerCase()) {
					isAValidPrefix = true
					break
				}
			}

			for (const suffix of clanNames.suffixes) {
				if (suffix.toLowerCase() === affix.toLowerCase()) {
					isAValidSuffix = true
					break
				}
			}

			let content = ''

			if (isAValidPrefix && isAValidSuffix) {
				content = `${affix} is both a canonically-valid prefix and a suffix.`
			} else if (isAValidPrefix) {
				content = `${affix} is a canonically-valid prefix.`
			} else if (isAValidSuffix) {
				content = `${affix} is a canonically-valid suffix.`
			} else {
				content = `${affix} is neither a canonically-valid prefix nor a suffix.`
			}

			return messageResponse({
				content,
				allowedMentions: {
					users: [],
					roles: [],
				},
			})
		}
	},
} as Command
