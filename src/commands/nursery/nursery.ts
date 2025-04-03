import * as DAPI from 'discord-api-types/v10'

import { simpleEphemeralResponse } from '@/discord/responses'
import * as listMessage from '@/discord/list-message'
import * as nurseryManager from './game/nursery-manager'
import * as nurseryViews from './nursery-views'

import StatusSubcommand from './subcommands/status'
import HomeSubcommand from './subcommands/home'
import BreedSubcommand from './subcommands/breed'
import FeedSubcommand from './subcommands/feed'
import CooldownsSubcommand from './subcommands/cooldowns'
import CheckSubcommand from './subcommands/check'
import PromoteSubcommand from './subcommands/promote'
import CoolSubcommand from './subcommands/cool'
import ComfortSubcommand from './subcommands/comfort'
import GroomSubcommand from './subcommands/groom'
import AlertsSubcommand from './subcommands/alerts'
import DismissSubcommand from './subcommands/dismiss'
import PauseSubcommand from './subcommands/pause'
import FindSubcommand from './subcommands/find'
import MedicineSubcommand from './subcommands/medicine'
import PlaySubcommand from './subcommands/play'

import { type Command, type Subcommand } from '@/commands'

const subcommands: { [name: string]: Subcommand } = {
	[StatusSubcommand.name]: StatusSubcommand,
	[HomeSubcommand.name]: HomeSubcommand,
	[BreedSubcommand.name]: BreedSubcommand,
	[FeedSubcommand.name]: FeedSubcommand,
	[CooldownsSubcommand.name]: CooldownsSubcommand,
	[CheckSubcommand.name]: CheckSubcommand,
	[PromoteSubcommand.name]: PromoteSubcommand,
	[CoolSubcommand.name]: CoolSubcommand,
	[ComfortSubcommand.name]: ComfortSubcommand,
	[GroomSubcommand.name]: GroomSubcommand,
	[AlertsSubcommand.name]: AlertsSubcommand,
	[DismissSubcommand.name]: DismissSubcommand,
	[PauseSubcommand.name]: PauseSubcommand,
	[FindSubcommand.name]: FindSubcommand,
	[MedicineSubcommand.name]: MedicineSubcommand,
	[PlaySubcommand.name]: PlaySubcommand,
}

export default {
	name: 'nursery',

	subcommands,
	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'nursery',
		description: 'Take care of kits.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall, DAPI.ApplicationIntegrationType.UserInstall],
		contexts: [
			DAPI.InteractionContextType.Guild,
			DAPI.InteractionContextType.BotDM,
			DAPI.InteractionContextType.PrivateChannel,
		],

		options: Object.values(subcommands).map((subcommand) => subcommand.subcommand),
	},

	async onMessageComponent({ interaction, user, componentType, customId, parsedCustomId, values }) {
		if (parsedCustomId[1] === 'status') {
			const userDiscordId = parsedCustomId[3]
			const username = interaction.message.content
				.split("'s nursery")[0]
				.replaceAll('\u001b[1;2m', '')
				.replaceAll('\u001b[0m', '')

			const nursery =
				user.id === userDiscordId ?
					await nurseryManager.getNursery(user, false)
				:	await nurseryManager.getNursery({ id: userDiscordId, username } as any, false)
			const messages = interaction.message.content.split('```ansi')[0]

			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'status',

				messages: [messages],
				preserveMessageFormatting: true,

				scroll: true,
				scrollPageData: parsedCustomId[2],
			})
		} else if (parsedCustomId[1] === 'home') {
			const userDiscordId = parsedCustomId[3]
			const username = interaction.message.content
				.split("'s nursery")[0]
				.replaceAll('\u001b[1;2m', '')
				.replaceAll('\u001b[0m', '')

			const nursery =
				user.id === userDiscordId ?
					await nurseryManager.getNursery(user, false)
				:	await nurseryManager.getNursery({ id: userDiscordId, username } as any, false)
			const messages = interaction.message.content.split('```ansi')[0]

			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',

				messages: [messages],
				preserveMessageFormatting: true,

				scroll: true,
				scrollPageData: parsedCustomId[2],
			})
		}
	},
} as Command
