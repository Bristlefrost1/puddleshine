import * as DAPI from 'discord-api-types/v10';

import { simpleEphemeralResponse } from '#discord/responses.js';
import * as listMessage from '#discord/list-message.js';
import * as nurseryManager from './game/nursery-manager.js';
import * as nurseryViews from './nursery-views.js';

import StatusSubcommand from './subcommands/status.js';
import HomeSubcommand from './subcommands/home.js';
import BreedSubcommand from './subcommands/breed.js';
import FeedSubcommand from './subcommands/feed.js';
import CooldownsSubcommand from './subcommands/cooldowns.js';
import CheckSubcommand from './subcommands/check.js';
import PromoteSubcommand from './subcommands/promote.js';
import CoolSubcommand from './subcommands/cool.js';
import ComfortSubcommand from './subcommands/comfort.js';
import GroomSubcommand from './subcommands/groom.js';
import AlertsSubcommand from './subcommands/alerts.js';
import DismissSubcommand from './subcommands/dismiss.js';
import PauseSubcommand from './subcommands/pause.js';
import FindSubcommand from './subcommands/find.js';
import MedicineSubcommand from './subcommands/medicine.js';
import PlaySubcommand from './subcommands/play.js';

import type { Command } from '../command.js';
import type { Subcommand } from '#commands/subcommand.js';

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
};

const NurseryCommand: Command = {
	name: 'nursery',

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

	async execute({ interaction, user, subcommandGroup, subcommand, options, env, ctx }) {
		if (!subcommand) return simpleEphemeralResponse('No subcommand provided.');

		const subcommandName = subcommand.name;

		if (subcommands[subcommandName])
			return await subcommands[subcommandName].execute({ interaction, user, commandOptions: options, env, ctx });
	},

	async onMessageComponent({ interaction, user, componentType, customId, parsedCustomId, values, env, ctx }) {
		if (parsedCustomId[1] === 'status') {
			const userDiscordId = parsedCustomId[3];
			const username = interaction.message.content
				.split("'s nursery")[0]
				.replaceAll('\u001b[1;2m', '')
				.replaceAll('\u001b[0m', '');

			const nursery =
				user.id === userDiscordId ?
					await nurseryManager.getNursery(user, env, false)
				:	await nurseryManager.getNursery({ id: userDiscordId, username } as any, env, false);
			const messages = interaction.message.content.split('```ansi')[0];

			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'status',

				messages: [messages],
				preserveMessageFormatting: true,

				scroll: true,
				scrollPageData: parsedCustomId[2],
			});
		} else if (parsedCustomId[1] === 'home') {
			const userDiscordId = parsedCustomId[3];
			const username = interaction.message.content
				.split("'s nursery")[0]
				.replaceAll('\u001b[1;2m', '')
				.replaceAll('\u001b[0m', '');

			const nursery =
				user.id === userDiscordId ?
					await nurseryManager.getNursery(user, env, false)
				:	await nurseryManager.getNursery({ id: userDiscordId, username } as any, env, false);
			const messages = interaction.message.content.split('```ansi')[0];

			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',

				messages: [messages],
				preserveMessageFormatting: true,

				scroll: true,
				scrollPageData: parsedCustomId[2],
			});
		}
	},
};

export default NurseryCommand;
