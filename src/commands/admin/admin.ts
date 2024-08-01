import * as DAPI from 'discord-api-types/v10';

import { embedMessageResponse, simpleEphemeralResponse } from '#discord/responses.js';

import * as userAdminCommands from './user/user.js';
import * as catchaAdminCommands from './catcha/catcha-admin.js';

import type { Command } from '../command.js';

import adminServers from '#resources/admin-servers.json' with { type: 'json' };

enum AdminAccessLevel {
	SuperAdmin = 'SuperAdmin',
	Admin = 'Admin',
	None = 'None',
}

async function getAdminAccessLevel(env: Env, userId: string): Promise<AdminAccessLevel> {
	const superAdminDiscordIdKV = await env.KV.get('BotSuperAdminDiscordId');
	const adminDiscordIdsKV = await env.KV.get('BotAdminDiscordIds');

	let superAdminDiscordId: string | undefined;
	let adminDiscordIds: string[] = [];

	if (superAdminDiscordIdKV) superAdminDiscordId = superAdminDiscordIdKV;

	if (adminDiscordIdsKV) {
		adminDiscordIds = adminDiscordIdsKV.split(',');
	}

	if (userId === superAdminDiscordId) {
		return AdminAccessLevel.SuperAdmin;
	} else if (adminDiscordIds.includes(userId)) {
		return AdminAccessLevel.Admin;
	} else {
		return AdminAccessLevel.None;
	}
}

const AdminCommand: Command = {
	name: 'admin',

	onlyGuilds: adminServers,

	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'admin',
		description: 'A command for performing administrative tasks with the bot.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall],
		contexts: [DAPI.InteractionContextType.Guild],

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.SubcommandGroup,
				name: 'user',
				description: 'View and manage users.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'get',
						description: 'Query the database for user information.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user to query',
								required: true,
							},
						],
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.SubcommandGroup,
				name: 'catcha',
				description: "View and manage users' Catchas.",

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'get',
						description: "Show a user's Catcha.",

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user whose Catcha to show',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'setrolls',
						description: "Set a user's rolls to a number.",

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user whose rolls to set',
								required: true,
							},
							{
								type: DAPI.ApplicationCommandOptionType.Integer,
								name: 'rolls',
								description: 'The rolls',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'trade_block',
						description: 'Block a user from trading.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user to block',
								required: true,
							},
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'expires',
								description: 'The expiration date and time of the trade block in ISO string format',
							},
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'reason',
								description: 'The reason that will be shown to the user',
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'trade_unblock',
						description: 'Remove a trade block from a user.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user to unblock from trading',
								required: true,
							},
						],
					},
				],
			},
		],
	},

	async execute({ interaction, user, subcommandGroup, subcommand, options, env, ctx }) {
		if (!subcommand) throw 'No subcommand provided';

		const accessLevel = await getAdminAccessLevel(env, user.id);
		if (accessLevel === AdminAccessLevel.None)
			return simpleEphemeralResponse("You don't have access to admin commands.");

		if (subcommandGroup) {
			switch (subcommandGroup.name) {
				case 'user':
					return await userAdminCommands.handleUserAdminCommand(
						interaction,
						user,
						accessLevel,
						subcommand,
						options,
						env,
						ctx,
					);
				case 'catcha':
					return await catchaAdminCommands.handleCatchaAdminCommand(
						interaction,
						user,
						accessLevel,
						subcommand,
						options,
						env,
						ctx,
					);
				default:
					return simpleEphemeralResponse('An error occured.');
			}
		}

		return embedMessageResponse({
			description: 'Hello, World!',
		});
	},
};

export default AdminCommand;
export { AdminAccessLevel };
