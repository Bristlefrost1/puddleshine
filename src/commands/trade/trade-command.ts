import * as DAPI from 'discord-api-types/v10'

import { simpleEphemeralResponse } from '@/discord/responses'

import CancelSubcommand from './subcommands/cancel'
import ClearSubcommand from './subcommands/clear'
import RequestSubcommand from './subcommands/request'
import * as tradeConfirmation from './confirmation'

import { type Command, type Subcommand } from '@/commands'

const subcommands: { [name: string]: Subcommand } = {
	[RequestSubcommand.name]: RequestSubcommand,
	[ClearSubcommand.name]: ClearSubcommand,
	[CancelSubcommand.name]: CancelSubcommand,
}

export default {
	name: 'trade',

	subcommands,
	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'trade',
		description: 'Trade with other users.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall, DAPI.ApplicationIntegrationType.UserInstall],
		contexts: [DAPI.InteractionContextType.Guild, DAPI.InteractionContextType.PrivateChannel],

		options: Object.values(subcommands).map((subcommand) => subcommand.subcommand),
	},

	async onMessageComponent({ interaction, user, parsedCustomId }) {
		// The trade confirmation accept/decline button custom ID is of format
		// trade/[y or n]/[trade UUID],[side 1 Discord ID],[side 2 Discord ID]
		const yesOrNo = parsedCustomId[1] as 'y' | 'n' // y = accept, n = decline
		const interactionData = parsedCustomId[2].split(',') // Parse the last part of the custom ID

		// Grab the Discord IDs of the parties
		const senderDiscordId = interactionData[1] // Side 1 Discord ID
		const recipientDiscordId = interactionData[2] // Side 2 Discord ID

		// Make sure the user is a party to the trade
		if (user.id !== senderDiscordId && user.id !== recipientDiscordId) {
			return simpleEphemeralResponse('This is not your trade.')
		}

		if (yesOrNo === 'y') {
			// Accept the trade
			return await tradeConfirmation.accept(interaction, interactionData, user)
		} else {
			// Decline it
			return await tradeConfirmation.decline(interaction, interactionData, user)
		}
	},
} as Command
