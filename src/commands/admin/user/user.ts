import * as DAPI from 'discord-api-types/v10';

import { embedMessageResponse, simpleEphemeralResponse } from '#discord/responses.js';
import { discordGetUser } from '#discord/api/discord-user.js';
import * as db from '#db/database.js';
import { AdminAccessLevel } from '../admin.js';

import * as config from '#config.js';

async function getUser(
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	env: Env,
): Promise<DAPI.APIInteractionResponse> {
	let userId: string | undefined;

	if (options[0] && options[0].type === DAPI.ApplicationCommandOptionType.User) {
		userId = options[0].value;
	}

	if (!userId) return simpleEphemeralResponse('No user option provided.');

	const userData = await db.getUserWithDiscordId(env.PRISMA, userId);

	if (userData) {
		const discordUser = await discordGetUser(env.DISCORD_TOKEN, userId);
		const discordUserDetailsString = `Discord user ID: ${userId}\nDiscord username: \`${discordUser?.username}\`\n`;

		const userUuid = userData.uuid;
		const createdAtUnixTimestamp = Math.floor(userData.createdAt.getTime() / 1000);

		return embedMessageResponse({
			title: 'User details',
			description: discordUserDetailsString,
			fields: [{ name: 'Details', value: `User UUID: ${userUuid}\nCreated at: <t:${createdAtUnixTimestamp}:F>` }],
		});
	} else {
		return embedMessageResponse({
			color: config.ERROR_COLOR,
			description: 'No user found in the database.',
		});
	}
}

async function handleUserAdminCommand(
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
			return await getUser(options!, env);
		default:
		// Do nothing
	}

	return simpleEphemeralResponse('No command found.');
}

export { handleUserAdminCommand };
