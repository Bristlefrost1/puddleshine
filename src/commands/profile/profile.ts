import * as DAPI from 'discord-api-types/v10';

import { messageResponse, simpleEphemeralResponse, simpleMessageResponse } from '#discord/responses.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import * as clanNames from '#utils/clan-names.js';
import * as dateTimeUtils from '#utils/date-time-utils.js';
import * as db from '#db/database.js';

import type { Command } from '../command.js';
import { discordGetUser } from '#discord/api/discord-user.js';

async function getProfile(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined,
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const { user: userIdOption } = parseCommandOptions(commandOptions);
	const lookupDiscordId = (userIdOption?.value as string) ?? user.id;

	const profileQueryResult = await db.findProfileWithDiscordId(env.PRISMA, lookupDiscordId);

	let name: string | undefined;
	let birthday: string | undefined;

	if (profileQueryResult) {
		name = profileQueryResult.name ?? undefined;

		if (profileQueryResult.birthday) {
			const splitBirthday = profileQueryResult.birthday.split('-');

			const month = dateTimeUtils.months[Number.parseInt(splitBirthday[0]) - 1];
			const day = Number.parseInt(splitBirthday[1]);

			birthday = `${day} ${month}`;
		}
	}

	let username = lookupDiscordId;

	if (lookupDiscordId === user.id) {
		username = user.username;
	} else {
		const discordUser = await discordGetUser(env.DISCORD_TOKEN, lookupDiscordId);

		if (discordUser) username = discordUser.username;
	}

	const embedDescription = `
Name: ${name ?? 'Not set'}
Birthday: ${birthday ?? 'Not set'}
`;

	return messageResponse({
		embeds: [
			{
				title: `${username}'s profile`,
				description: '```' + embedDescription + '```',
			},
		],
	});
}

async function setName(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const { name: nameOption } = parseCommandOptions(commandOptions);

	if (!nameOption || nameOption.type !== DAPI.ApplicationCommandOptionType.String)
		return simpleEphemeralResponse('No name option provided.');

	const firstCharacter = nameOption.value.slice(undefined, 1).toLocaleUpperCase('en');
	const rest = nameOption.value.slice(1).toLocaleLowerCase('en');

	const newName = firstCharacter + rest;

	if (!clanNames.validateName(newName)) {
		return simpleMessageResponse(`${newName} is not a valid Clan name.`);
	}

	let userUuid: string;

	const profile = await db.findProfileWithDiscordId(env.PRISMA, user.id);

	if (profile) {
		userUuid = profile.userUuid;
	} else {
		const newProfile = await db.initializeProfile(env.PRISMA, user.id);
		userUuid = newProfile.userUuid;
	}

	await db.setProfileName(env.PRISMA, userUuid, newName);

	return simpleMessageResponse(`${newName} is your new warrior name.`);
}

async function setBirthday(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const { day: dayOption, month: monthOption } = parseCommandOptions(commandOptions);

	if (!dayOption || dayOption.type !== DAPI.ApplicationCommandOptionType.Integer)
		return simpleEphemeralResponse('No day option provided.');

	if (!monthOption || monthOption.type !== DAPI.ApplicationCommandOptionType.Integer)
		return simpleEphemeralResponse('No month option provided.');

	if (!dateTimeUtils.isDateValid(dayOption.value, monthOption.value))
		return simpleEphemeralResponse('The date provided is invalid.');

	const profile = await db.findProfileWithDiscordId(env.PRISMA, user.id);

	if (profile && profile.birthday !== null && env.ENV !== 'dev')
		return simpleEphemeralResponse("You've already entered a birthday and it cannot be changed.");

	let monthString = monthOption.value.toString();
	let dayString = dayOption.value.toString();

	if (monthString.length === 1) monthString = `0${monthString}`;
	if (dayString.length === 1) dayString = `0${dayString}`;

	const birthdayString = `${monthString}-${dayString}`;

	return messageResponse({
		ephemeral: true,
		embeds: [
			{
				title: 'Confirmation',
				description: `Are you sure you want to set **${dayOption.value} ${dateTimeUtils.months[monthOption.value - 1]}** as your birthday? Your birthday **cannot be changed** later once entered.`,
			},
		],
		components: [
			{
				type: DAPI.ComponentType.ActionRow,
				components: [
					{
						type: DAPI.ComponentType.Button,
						custom_id: `profile/birthday/y/${user.id},${birthdayString}`,
						style: DAPI.ButtonStyle.Success,
						label: '✅ Confirm',
					},
					{
						type: DAPI.ComponentType.Button,
						custom_id: `profile/birthday/n/${user.id},${birthdayString}`,
						style: DAPI.ButtonStyle.Danger,
						label: '❌ Cancel',
					},
				],
			},
		],
	});
}

async function handleBirthdayMessageComponent(
	interaction: DAPI.APIMessageComponentInteraction,
	parsedCustomId: string[],
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const yesOrNo = parsedCustomId[2] as 'y' | 'n';

	const data = parsedCustomId[3].split(',');
	const userId = data[0];
	const birthdayString = data[1];

	if (user.id !== userId) return simpleEphemeralResponse('This is not your confirmation.');

	if (yesOrNo === 'y') {
		const splitBirtday = birthdayString.split('-');

		const month = Number.parseInt(splitBirtday[0]);
		const day = Number.parseInt(splitBirtday[1]);

		let userUuid: string;
		const profile = await db.findProfileWithDiscordId(env.PRISMA, user.id);

		if (profile) {
			if (profile.birthday && env.ENV !== 'dev') {
				return messageResponse({
					content: 'Setting a birthday canceled: you already have a birthday set.',
					embeds: [],
					components: [],
					update: true,
				});
			}

			userUuid = profile.userUuid;
		} else {
			const newProfile = await db.initializeProfile(env.PRISMA, user.id);
			userUuid = newProfile.userUuid;
		}

		await db.setProfileBirthday(env.PRISMA, userUuid, month, day);

		return messageResponse({
			content: `Your birthday has been set to **${day} ${dateTimeUtils.months[month - 1]}**. You cannot change this later.`,
			embeds: [],
			components: [],
			update: true,
		});
	} else {
		return messageResponse({
			content: 'Setting a birthday canceled.',
			embeds: [],
			components: [],
			update: true,
		});
	}
}

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
				],
			},
		],
	},

	async execute({ interaction, user, subcommandGroup, subcommand, options, env, ctx }) {
		if (!subcommand) throw 'No subcommand provided';

		if (subcommandGroup?.name === 'set') {
			switch (subcommand.name) {
				case 'name':
					return await setName(interaction, options!, user, env, ctx);
				case 'birthday':
					return await setBirthday(interaction, options!, user, env, ctx);
				default:
					return simpleEphemeralResponse('No subcommand handler found.');
			}
		}

		switch (subcommand.name) {
			case 'get':
				return await getProfile(interaction, options, user, env, ctx);
			default:
				return simpleEphemeralResponse('No subcommand handler found.');
		}
	},

	async onMessageComponent({ interaction, user, componentType, customId, parsedCustomId, values, env, ctx }) {
		const action = parsedCustomId[1];

		switch (action) {
			case 'birthday':
				return await handleBirthdayMessageComponent(interaction, parsedCustomId, user, env, ctx);
			default:
				return simpleEphemeralResponse('No interaction handler found.');
		}
	},
};

export default ProfileCommand;
