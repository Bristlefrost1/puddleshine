import * as DAPI from 'discord-api-types/v10';

import * as clanNames from '#utils/clan-names.js';
import { messageResponse } from '#discord/responses.js';

import type { Command } from '../command.js';

const NameCommand: Command = {
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
				name: 'generate',
				description: 'Generate a random Clan name.',
			},
		],
	},

	async execute({ interaction, user, subcommandGroup, subcommand, options, env, ctx }) {
		if (!subcommand) return;

		if (subcommand.name === 'validate') {
			const nameOption = options![0].value as string;

			const firstCharacter = nameOption.slice(undefined, 1).toLocaleUpperCase('en');
			const rest = nameOption.slice(1).toLocaleLowerCase('en');

			const name = firstCharacter + rest;

			if (clanNames.validateName(name)) {
				return messageResponse({
					content: `${name} is a valid Clan name.`,
				});
			} else {
				return messageResponse({
					content: `${name} is not a valid Clan name.`,
				});
			}
		} else if (subcommand.name === 'generate') {
			const randomName = clanNames.generateRandomName();

			return messageResponse({
				content: `Generated a random Clan name: ${randomName}`,
			});
		}
	},
};

export default NameCommand;
