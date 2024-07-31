import * as DAPI from 'discord-api-types/v10';

import { embedMessageResponse, simpleEphemeralResponse } from '#discord/responses.js';
import { discordGetUser } from '#discord/api/discord-user.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import { AdminAccessLevel } from '../admin.js';

import * as config from '#config.js';

async function getCatcha(
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	env: Env,
): Promise<DAPI.APIInteractionResponse> {
	let userId: string | undefined;

	if (options[0] && options[0].type === DAPI.ApplicationCommandOptionType.User) {
		userId = options[0].value;
	}

	if (!userId) return simpleEphemeralResponse('No user option provided.');

	const catchaData = await catchaDB.findCatcha(env.PRISMA, userId);

	if (catchaData) {
		const stringifiedJson = JSON.stringify(catchaData, undefined, 4);
		const discordUser = await discordGetUser(env.DISCORD_TOKEN, userId);

		const discordUserDetailsString = `Discord user ID: ${userId}\nDiscord username: \`${discordUser?.username}#${discordUser?.discriminator}\`\n`;

		return embedMessageResponse({
			title: 'Database query results',
			description: discordUserDetailsString + '```json\n' + stringifiedJson + '\n```',
		});
	} else {
		return embedMessageResponse({
			color: config.ERROR_COLOR,
			description: 'No Catcha found in the database.',
		});
	}
}

async function handleCatchaAdminCommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	user: DAPI.APIUser,
	accessLevel: AdminAccessLevel,
	subcommand: DAPI.APIApplicationCommandInteractionDataSubcommandOption,
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	switch (subcommand.name) {
		case 'get':
			return await getCatcha(options!, env);
		default:
		// Do nothing
	}

	return simpleEphemeralResponse('No command found.');
}

export { handleCatchaAdminCommand };
