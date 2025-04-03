import * as DAPI from 'discord-api-types/v10'

import ListSubcommand from './subcommands/list'
import ViewSubcommand from './subcommands/view'

import { type Command, type Subcommand } from '@/commands'

const subcommands: { [name: string]: Subcommand } = {
	[ListSubcommand.name]: ListSubcommand,
	[ViewSubcommand.name]: ViewSubcommand,
}

export default {
	name: 'history',

	subcommands,
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
} as Command
