import * as DAPI from 'discord-api-types/v10';

import * as listMessage from '#discord/list-message.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import { messageResponse, embedMessageResponse, errorEmbed } from '#discord/responses.js';

import { getHistoryCats } from '#commands/history/history-cat/history-cat.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'list';

async function listHistoryCats(discordUserId: string, env: Env): Promise<string[]> {
	const returnArray: string[] = [];
	const historyCats = await getHistoryCats(discordUserId, env);

	if (historyCats.length === 0) return [];

	const descendingHistoryCats = historyCats.toReversed();

	for (const historyCat of descendingHistoryCats) {
		let gender = historyCat.gender.toLowerCase();
		if (gender === '') gender = 'cat';

		if (historyCat.isDead) {
			returnArray.push(
				`[${historyCat.position}] ${historyCat.fullName}, a ${gender}, died at ${Math.floor(historyCat.ageMoons)} moons`,
			);
		} else {
			returnArray.push(
				`[${historyCat.position}] ${historyCat.fullName}, a ${gender}, is ${Math.floor(historyCat.ageMoons)} moons`,
			);
		}
	}

	return returnArray;
}

const ListSubcommand: Subcommand = {
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

	async execute(options) {
		let listUserId = options.user.id;
		const { user: userOption } = parseCommandOptions(options.commandOptions);

		if (userOption && userOption.type === DAPI.ApplicationCommandOptionType.User) {
			listUserId = userOption.value;
		}

		const listOfCats = await listHistoryCats(listUserId, options.env);

		if (listOfCats.length === 0) {
			if (listUserId === options.user.id) {
				return embedMessageResponse(errorEmbed('Nothing found in your history.'));
			} else {
				return embedMessageResponse(errorEmbed("Nothing found in this user's history."));
			}
		}

		const list = listMessage.createListMessage({
			action: 'history/list',
			listDataString: listUserId,

			items: listOfCats,

			title: 'History',
		});

		return messageResponse({
			embeds: [list.embed],
			components: list.scrollActionRow ? [list.scrollActionRow] : undefined,
			allowedMentions: {
				users: [],
				roles: [],
			},
		});
	},

	async handleMessageComponent(options) {
		const pageData = options.parsedCustomId[2];
		const discordId = options.parsedCustomId[3];

		const listOfCats = await listHistoryCats(discordId, options.env);

		const newList = listMessage.scrollListMessage({
			action: 'history/list',
			pageData,
			listDataString: discordId,

			items: listOfCats,

			title: 'History',
		});

		return messageResponse({
			embeds: [newList.embed],
			components: newList.scrollActionRow ? [newList.scrollActionRow] : undefined,
			allowedMentions: {
				users: [],
				roles: [],
			},
			update: true,
		});
	},
};

export default ListSubcommand;
