import * as DAPI from 'discord-api-types/v10';

import * as discordUserApi from '#discord/api/discord-user.js';
import * as listMessage from '#discord/list-message.js';
import { messageResponse, simpleEphemeralResponse, embedMessageResponse, errorEmbed } from '#discord/responses.js';

import * as collection from '#commands/catcha/collection/collection.js';
import * as listUtils from '#commands/catcha/collection/list-utils.js';

async function getTitle(requestedBy: DAPI.APIUser, userId: string, env: Env) {
	let title = '';

	if (userId === requestedBy.id) {
		const discriminator = requestedBy.discriminator === '0' ? '' : `#${requestedBy.discriminator}`;
		title = `${requestedBy.username}${discriminator}'s collection`;
	} else {
		const discordUserFromId = await discordUserApi.discordGetUser(env.DISCORD_TOKEN, userId);

		if (discordUserFromId) {
			const discriminator = discordUserFromId.discriminator === '0' ? '' : `#${discordUserFromId.discriminator}`;
			title = `${discordUserFromId.username}${discriminator}'s collection`;
		} else {
			title = `${userId}'s collection`;
		}
	}

	return title;
}

async function listUserCollection(
	env: Env,
	options: {
		userId: string;

		onlyRarity?: number;
		onlyInverted?: boolean;
		onlyVariant?: boolean;
	},
): Promise<string[]> {
	const userCollection = await collection.getCollection(options.userId, env, {
		rarity: options.onlyRarity,
		onlyInverted: options.onlyInverted,
		onlyVariant: options.onlyVariant,
	});

	if (userCollection.length === 0) return [];

	const collectionList = listUtils.stringifyCollection(userCollection);

	return collectionList;
}

async function handleListScroll(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[],
	env: Env,
	ctx: ExecutionContext,
) {
	const pageData = parsedCustomId[2];
	const listDataString = parsedCustomId[3];
	const listData = listUtils.parseListDataString(listDataString);

	const collectionList = await listUserCollection(env, {
		userId: listData.userId,
		onlyRarity: listData.onlyRarity,
		onlyInverted: listData.onlyInverted,
		onlyVariant: listData.onlyVariant,
	});

	if (collectionList.length === 0) {
		return messageResponse({
			embeds: [
				errorEmbed(
					'No cards found.',
					interaction.message.embeds[0]?.title,
					listUtils.getRequestedByAuthor(user, listData.userId),
				),
			],
			update: true,
		});
	}

	const newList = listMessage.scrollListMessage({
		action: 'catcha/list',
		pageData,
		listDataString,

		items: collectionList,

		title: interaction.message.embeds[0]?.title,
		author: listUtils.getRequestedByAuthor(user, listData.userId),
	});

	return messageResponse({
		embeds: [newList.embed],
		components: newList.scrollActionRow !== undefined ? [newList.scrollActionRow] : undefined,
		update: true,
	});
}

async function handleListSubcommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined,
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
) {
	// Set the defaults
	let listUserId = user.id;
	let pageNumber = 1;
	let onlyRarity: number | undefined;
	let onlyInverted: boolean | undefined;
	let onlyVariant: boolean | undefined;

	// Parse the options
	if (commandOptions) {
		const searchOptions = listUtils.parseSearchOptions(commandOptions);

		listUserId = searchOptions.userId ?? listUserId;
		pageNumber = searchOptions.page ?? pageNumber;
		onlyRarity = searchOptions.onlyRarity;
		onlyInverted = searchOptions.onlyInverted;
		onlyVariant = searchOptions.onlyVariant;
	}

	if (pageNumber < 1) return simpleEphemeralResponse('The page number cannot be less than 1.');

	const collectionList = await listUserCollection(env, {
		userId: listUserId,
		onlyRarity,
		onlyInverted,
		onlyVariant,
	});

	if (collectionList.length === 0) {
		return embedMessageResponse(
			errorEmbed(
				'No cards found.',
				await getTitle(user, listUserId, env),
				listUtils.getRequestedByAuthor(user, listUserId),
			),
		);
	}

	const list = listMessage.createListMessage({
		action: 'catcha/list',
		listDataString: listUtils.buildListDataString(listUserId, onlyRarity, onlyInverted, onlyVariant),

		items: collectionList,
		pageNumber,

		title: await getTitle(user, listUserId, env),
		author: listUtils.getRequestedByAuthor(user, listUserId),
	});

	return messageResponse({
		embeds: [list.embed],
		components: list.scrollActionRow !== undefined ? [list.scrollActionRow] : undefined,
	});
}

export { handleListSubcommand, handleListScroll };
