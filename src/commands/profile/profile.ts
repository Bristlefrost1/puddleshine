import * as DAPI from 'discord-api-types/v10';

import { ClanRank } from '#utils/clans.js';

import type { Command } from '../command.js';

const ProfileCommand: Command = {
	name: 'profile',

	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'profile',
		description: 'View user profiles or update your own.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall, DAPI.ApplicationIntegrationType.UserInstall],
		contexts: [
			DAPI.InteractionContextType.Guild,
			DAPI.InteractionContextType.BotDM,
			DAPI.InteractionContextType.PrivateChannel,
		],

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: 'get',
				description: "View your or another user's profile.",

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.User,
						name: 'user',
						description: 'The user whose profile to look up',
						required: false,
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.SubcommandGroup,
				name: 'set',
				description: 'Update your profile.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'name',
						description: 'Set your warrior name.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'name',
								description: 'Your new warrior name',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'birthday',
						description: 'Set your birthday. This can only be done once.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.Integer,
								name: 'day',
								description: 'The day of your birthday',
								required: true,
							},
							{
								type: DAPI.ApplicationCommandOptionType.Integer,
								name: 'month',
								description: 'The month of your birthday',
								required: true,

								choices: [
									{ name: 'January', value: 1 },
									{ name: 'February', value: 2 },
									{ name: 'March', value: 3 },
									{ name: 'April', value: 4 },
									{ name: 'May', value: 5 },
									{ name: 'June', value: 6 },
									{ name: 'July', value: 7 },
									{ name: 'August', value: 8 },
									{ name: 'September', value: 9 },
									{ name: 'October', value: 10 },
									{ name: 'November', value: 11 },
									{ name: 'December', value: 12 },
								],
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'clan',
						description: 'Set your Clan.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'clan',
								description: 'Your new Clan',
								required: true,
								autocomplete: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: 'rank',
						description: 'Set your rank within a Clan.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'rank',
								description: 'Your new rank',
								required: true,

								choices: [
									{ name: 'Kit', value: ClanRank.Kit },
									{
										name: 'Warrior Apprentice',
										value: ClanRank.WarriorApprentice,
									},
									{
										name: 'Medicine Cat Apprentice',
										value: ClanRank.MedicineCatApprentice,
									},
									{
										name: 'Warrior',
										value: ClanRank.Warrior,
									},
									{ name: 'Queen', value: ClanRank.Queen },
									{ name: 'Elder', value: ClanRank.Elder },
									{
										name: 'Medicine Cat',
										value: ClanRank.MedicineCat,
									},
									{
										name: 'Mediator',
										value: ClanRank.Mediator,
									},
									{ name: 'Deputy', value: ClanRank.Deputy },
									{ name: 'Leader', value: ClanRank.Leader },
								],
							},
						],
					},
				],
			},
		],
	},

	async execute({ interaction, user, subcommandGroup, subcommand, options, env, ctx }) {},
};

export default ProfileCommand;
