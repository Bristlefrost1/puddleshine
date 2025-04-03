import * as DAPI from 'discord-api-types/v10'

import { embedMessageResponse, simpleEphemeralResponse } from '@/discord/responses'
import { bot } from '@/bot'

import * as userAdminCommands from './user/user'
import * as catchaAdminCommands from './catcha/catcha-admin'
import * as artistAdminCommands from './artist/artist-admin'
import * as tradeAdminCommands from './trade/trade-admin'
import { getArtistAutocompleChoices } from '@/commands/catcha/artist/autocomplete-artist'

import type { Command } from '@/commands'

import adminGuilds from './admin-guilds.json'

export enum AdminAccessLevel {
	SuperAdmin = 'SuperAdmin',
	Admin = 'Admin',
	None = 'None',
}

async function getAdminAccessLevel(userId: string): Promise<AdminAccessLevel> {
	const superAdminDiscordIdKV = await bot.env.KV.get('BotSuperAdminDiscordId')
	const adminDiscordIdsKV = await bot.env.KV.get('BotAdminDiscordIds')

	let superAdminDiscordId: string | undefined
	let adminDiscordIds: string[] = []

	if (superAdminDiscordIdKV) superAdminDiscordId = superAdminDiscordIdKV

	if (adminDiscordIdsKV) {
		adminDiscordIds = adminDiscordIdsKV.split(',')
	}

	if (userId === superAdminDiscordId) {
		return AdminAccessLevel.SuperAdmin
	} else if (adminDiscordIds.includes(userId)) {
		return AdminAccessLevel.Admin
	} else {
		return AdminAccessLevel.None
	}
}

export default {
	name: 'admin',

	onlyGuilds: adminGuilds,

	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'admin',
		description: 'A command for performing administrative tasks with the bot.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall],
		contexts: [DAPI.InteractionContextType.Guild],

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.SubcommandGroup,
				name: 'admins',
				description: 'Manage other admins as a super admin.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'add',
						description: 'Grant admin acccess to a user.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user to grant admin access to',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'remove',
						description: 'Remove admin access from a user.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user whose admin access to revoke',
								required: true,
							},
						],
					},
				],
			},
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
				description: 'View and manage Catchas.',

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
						name: 'current_roll_period',
						description: 'Show the current roll period.',
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.SubcommandGroup,
				name: 'profile',
				description: 'Manage user profiles',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'set_name',
						description: "Set a user's profile name (bypasses all checks)",

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user whose profile name to change',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'set_birthday',
						description: "Set a user's birthday even if they've already set one",

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user whose birthday to set',
								required: true,
							},
						],
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.SubcommandGroup,
				name: 'trade',
				description: 'View and manage trades.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'history',
						description: 'Show the trade history of the given user',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user whose trade history to show',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'view',
						description: 'View a trade by UUID',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'trade_uuid',
								description: 'The UUID of the trade to view',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'block',
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
						name: 'unblock',
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
			{
				type: DAPI.ApplicationCommandOptionType.SubcommandGroup,
				name: 'artist',
				description: 'Manage artist profiles.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'initialise',
						description: 'Initialise an artist profile with the given name and link it to a user',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'artist',
								description: 'The artist whose profile to initialise',
								required: true,
								autocomplete: true,
							},
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user to link to',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'link_user',
						description: 'Link an artist profile to a Discord user',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'artist',
								description: 'The artist profile to link',
								required: true,
								autocomplete: true,
							},
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: 'The user to link to',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'rename',
						description: "Rename an artist profile if it has been updated in the bot's files",

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'artist',
								description: 'The artist profile to update',
								required: true,
								autocomplete: true,
							},
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'new_name',
								description: 'The new name of the artist profile',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'display_name',
						description: 'Edit an artist profile display name',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'artist',
								description: 'The artist profile to update',
								required: true,
								autocomplete: true,
							},
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'display_name',
								description: 'The new display name',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'description',
						description: 'Edit an artist profile description',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'artist',
								description: 'The artist profile to update',
								required: true,
								autocomplete: true,
							},
						],
					},
				],
			},
		],
	},

	async onApplicationCommand({ interaction, user, subcommandGroup, subcommand, options }) {
		if (!subcommand) throw 'No subcommand provided'

		const accessLevel = await getAdminAccessLevel(user.id)

		if (accessLevel === AdminAccessLevel.None)
			return simpleEphemeralResponse("You don't have access to admin commands.")

		if (subcommandGroup) {
			switch (subcommandGroup.name) {
				case 'user':
					return await userAdminCommands.handleUserAdminCommand(
						interaction,
						user,
						accessLevel,
						subcommand,
						options,
					)

				case 'catcha':
					return await catchaAdminCommands.handleCatchaAdminCommand(
						interaction,
						user,
						accessLevel,
						subcommand,
						options,
					)

				case 'artist':
					return await artistAdminCommands.handleArtistAdminCommand(
						interaction,
						user,
						accessLevel,
						subcommand,
						options,
					)

				case 'trade':
					return await tradeAdminCommands.handleTradeAdminCommand(
						interaction,
						user,
						accessLevel,
						subcommand,
						options,
					)

				default:
					return simpleEphemeralResponse('An error occured.')
			}
		}

		return embedMessageResponse({
			description: 'Hello, World!',
		})
	},

	async onMessageComponent({ interaction, user, parsedCustomId }) {
		const accessLevel = await getAdminAccessLevel(user.id)

		if (accessLevel === AdminAccessLevel.None)
			return simpleEphemeralResponse("You don't have access to admin commands.")

		switch (parsedCustomId[1]) {
			case 'trade':
				return await tradeAdminCommands.handleTradeAdminMessageComponent(
					interaction,
					user,
					accessLevel,
					parsedCustomId,
				)

			default:
				// Do nothing
		}
	},

	async onAutocomplete({ interaction, user, subcommandGroup, subcommand, options, focusedOption }) {
		if (focusedOption.name === 'artist' && focusedOption.type === DAPI.ApplicationCommandOptionType.String) {
			return { choices: await getArtistAutocompleChoices(focusedOption.value) }
		}

		// Unknown focused option. Return a default error message.
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
