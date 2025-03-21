import * as DAPI from 'discord-api-types/v10';

import { parseCommandOptions } from '#discord/parse-options.js';
import { messageResponse, embedMessageResponse, errorEmbed, simpleEphemeralResponse } from '#discord/responses.js';

import { getHistoryCats } from '#commands/history/history-cat/history-cat.js';
import { stringifyPelt } from '#cat/pelts.js';
import { stringifyEyes } from '#cat/eyes.js';
import { ClanRankDisplay } from '#utils/clans.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'view';

const ViewSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'View a cat in your history.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.Integer,
				name: 'position',
				description: "The cat's position",
				required: true,
			},
			{
				type: DAPI.ApplicationCommandOptionType.User,
				name: 'user',
				description: 'The user whose history to view',

				required: false,
			},
		],
	},

	async execute(options) {
		let historyUserId = options.user.id;
		const { position: positionOption, user: userOption } = parseCommandOptions(options.commandOptions);

		if (!positionOption || positionOption.type !== DAPI.ApplicationCommandOptionType.Integer)
			return simpleEphemeralResponse('No `position` provided.');

		if (userOption && userOption.type === DAPI.ApplicationCommandOptionType.User) {
			historyUserId = userOption.value;
		}

		const historyCats = await getHistoryCats(historyUserId, options.env);
		const position = positionOption.value;

		if (historyCats.length === 0) {
			if (historyUserId === options.user.id) {
				return embedMessageResponse(errorEmbed('Nothing found in your history.'));
			} else {
				return embedMessageResponse(errorEmbed("Nothing found in this user's history."));
			}
		}

		const cat = historyCats[position - 1];

		if (!cat) {
			return embedMessageResponse(errorEmbed(`No cat found at position ${position}.`));
		}

		let details = `
Name: ${cat.fullName}
Gender: ${cat.gender}
${cat.isDead ? `Died at: ${cat.ageMoons.toFixed(2)} moons` : `Age: ${cat.ageMoons.toFixed(2)} moons`}
${cat.clan !== undefined ? `Clan: ${cat.clan}` : ''}
Rank: ${ClanRankDisplay[cat.rank]}
`;

		if (cat.pelt && cat.eyes) {
			details += '\n';

			const pelt = stringifyPelt(cat.pelt).toLowerCase();
			const eyes = stringifyEyes(cat.eyes).toLowerCase();

			details += `Description: ${pelt} with ${eyes}`;
		}

		return messageResponse({
			embeds: [
				{
					title: cat.fullName,
					description: `\`\`\`${details}\`\`\``,
					footer: { text: `${cat.uuid} • Time of storage` },
					timestamp: cat.dateStored.toISOString(),
				},
			],
			allowedMentions: {
				users: [],
				roles: [],
			},
		});
	},
};

export default ViewSubcommand;
