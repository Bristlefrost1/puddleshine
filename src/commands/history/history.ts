import * as DAPI from 'discord-api-types/v10';

import { simpleEphemeralResponse } from '#discord/responses.js';

import ListSubcommand from './subcommands/list.js';
import ViewSubcommand from './subcommands/view.js';

import type { Command } from '../command.js';
import type { Subcommand } from '#commands/subcommand.js';

const subcommands: { [name: string]: Subcommand } = {
	[ListSubcommand.name]: ListSubcommand,
	[ViewSubcommand.name]: ViewSubcommand,
};

const HistoryCommand: Command = {
	name: 'history',

	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'history',
		description: 'View your history with the bot.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall, DAPI.ApplicationIntegrationType.UserInstall],
		contexts: [
			DAPI.InteractionContextType.Guild,
			DAPI.InteractionContextType.BotDM,
			DAPI.InteractionContextType.PrivateChannel,
		],

		options: Object.values(subcommands).map((subcommand) => subcommand.subcommand),
	},

	async execute({ interaction, user, subcommandGroup, subcommand, options, env, ctx }) {
		if (!subcommand) return simpleEphemeralResponse('No subcommand provided.');

		const subcommandName = subcommand.name;

		if (subcommands[subcommandName])
			return await subcommands[subcommandName].execute({ interaction, user, commandOptions: options, env, ctx });
	},

	async onMessageComponent({ interaction, user, componentType, customId, parsedCustomId, values, env, ctx }) {
		const subcommandName = parsedCustomId[1];

		if (subcommands[subcommandName]) {
			const subcommand = subcommands[subcommandName];

			if (subcommand.handleMessageComponent) {
				return await subcommand.handleMessageComponent({
					interaction,
					user,
					parsedCustomId,
					env,
					ctx,
				});
			}
		}
	},
};

export default HistoryCommand;
