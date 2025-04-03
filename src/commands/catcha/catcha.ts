import * as DAPI from 'discord-api-types/v10'

import { type Command, type Subcommand } from '@/commands'
import { getAutocompleteChoices } from './archive/autocomplete-card'
import { getArtistAutocompleChoices } from './artist/autocomplete-artist'

import ArchiveSubcommand from './subcommands/archive-subcommand'
import ArtistSubcommand from './subcommands/artist-subcommand'
import BirthdaySubcommand from './subcommands/birthday-subcommand'
import BurnSubcommand from './subcommands/burn-subcommand'
import CompareSubcommand from './subcommands/compare-subcommand'
import DuplicatesSubcommand from './subcommands/duplicates-subcommand'
import EventSubcommand from './subcommands/event-subcommand'
import ListSubcommand from './subcommands/list-subcommand'
import LocateSubcommand from './subcommands/locate-subcommand'
import RemainingSubcommand from './subcommands/remaining-subcommand'
import RollSubcommand from './subcommands/roll-subcommand'
import StatsSubcommand from './subcommands/stats-subcommand'
import ViewSubcommand from './subcommands/view-subcommand'

import { handleArtScroll } from './art'
import { handleClaim } from './rolling/claim'

const subcommands: { [name: string]: Subcommand } = {
	[ArchiveSubcommand.name]: ArchiveSubcommand,
	[ArtistSubcommand.name]: ArtistSubcommand,
	[BirthdaySubcommand.name]: BirthdaySubcommand,
	[BurnSubcommand.name]: BurnSubcommand,
	[CompareSubcommand.name]: CompareSubcommand,
	[DuplicatesSubcommand.name]: DuplicatesSubcommand,
	[EventSubcommand.name]: EventSubcommand,
	[ListSubcommand.name]: ListSubcommand,
	[LocateSubcommand.name]: LocateSubcommand,
	[RemainingSubcommand.name]: RemainingSubcommand,
	[RollSubcommand.name]: RollSubcommand,
	[StatsSubcommand.name]: StatsSubcommand,
	[ViewSubcommand.name]: ViewSubcommand,
}

export default {
	name: 'catcha',

	subcommands,
	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'catcha',
		description: 'A Warriors card collection game.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall, DAPI.ApplicationIntegrationType.UserInstall],
		contexts: [
			DAPI.InteractionContextType.Guild,
			DAPI.InteractionContextType.BotDM,
			DAPI.InteractionContextType.PrivateChannel,
		],

		options: Object.values(subcommands).map((subcommand) => subcommand.subcommand),
	},

	async onMessageComponent(options) {
		const { interaction, user, componentType, customId, parsedCustomId, values } = options
		const action = parsedCustomId[1]

		switch (action) {
			case 'art':
				return await handleArtScroll(interaction, user, parsedCustomId)

			case 'claim':
				return await handleClaim(interaction, user, parsedCustomId)

			default:
				// Do nothing
		}
	},

	async onAutocomplete({ interaction, user, subcommandGroup, subcommand, options, focusedOption }) {
		if (focusedOption.name === 'card' && focusedOption.type === DAPI.ApplicationCommandOptionType.String) {
			return { choices: await getAutocompleteChoices(focusedOption.value, interaction.guild_id) }
		} else if (focusedOption.name === 'artist' && focusedOption.type === DAPI.ApplicationCommandOptionType.String) {
			return { choices: await getArtistAutocompleChoices(focusedOption.value) }
		}

		return {
			choices: [
				{
					name: 'Error - Something went wrong',
					value: 'Error',
				},
			],
		}
	},
} as Command
