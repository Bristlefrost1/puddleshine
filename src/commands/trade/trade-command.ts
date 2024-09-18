import * as DAPI from 'discord-api-types/v10';

import { simpleEphemeralResponse } from '#discord/responses.js';

import CancelSubcommand from './subcommands/cancel.js';
import ClearSubcommand from './subcommands/clear.js';
import RequestSubcommand from './subcommands/request.js';
import * as tradeConfirmation from './confirmation.js';

import type { Command } from '../command.js';
import type { Subcommand } from '#commands/subcommand.js';

const subcommands: { [name: string]: Subcommand } = {
	[RequestSubcommand.name]: RequestSubcommand,
	[ClearSubcommand.name]: ClearSubcommand,
	[CancelSubcommand.name]: CancelSubcommand,
};

const TradeCommand: Command = {
	name: 'trade',

	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'trade',
		description: 'Trade with other users.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall, DAPI.ApplicationIntegrationType.UserInstall],
		contexts: [DAPI.InteractionContextType.Guild, DAPI.InteractionContextType.PrivateChannel],

		options: Object.values(subcommands).map((subcommand) => subcommand.subcommand),
	},

	async execute({ interaction, user, subcommandGroup, subcommand, options, env, ctx }) {
		if (!subcommand) return simpleEphemeralResponse('No subcommand provided.');

		const subcommandName = subcommand.name;

		if (subcommands[subcommandName])
			return await subcommands[subcommandName].execute({ interaction, user, commandOptions: options, env, ctx });
	},

	async onMessageComponent({ interaction, user, componentType, customId, parsedCustomId, values, env, ctx }) {
		// The trade confirmation accept/decline button custom ID is of format
		// trade/[y or n]/[trade UUID],[side 1 Discord ID],[side 2 Discord ID]
		const yesOrNo = parsedCustomId[1] as 'y' | 'n'; // y = accept, n = decline
		const interactionData = parsedCustomId[2].split(','); // Parse the last part of the custom ID

		// Grab the Discord IDs of the parties
		const senderDiscordId = interactionData[1]; // Side 1 Discord ID
		const recipientDiscordId = interactionData[2]; // Side 2 Discord ID

		// Make sure the user is a party to the trade
		if (user.id !== senderDiscordId && user.id !== recipientDiscordId) {
			return simpleEphemeralResponse('This is not your trade.');
		}

		if (yesOrNo === 'y') {
			// Accept the trade
			return await tradeConfirmation.accept(interaction, interactionData, user, env);
		} else {
			// Decline it
			return await tradeConfirmation.decline(interaction, interactionData, user, env);
		}

		/*
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
		*/
	},
};

export default TradeCommand;
