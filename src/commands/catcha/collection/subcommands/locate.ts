import * as DAPI from 'discord-api-types/v10';

import * as discordUserApi from '#discord/api/discord-user.js';
import * as listMessage from '#discord/list-message.js';
import { messageResponse, simpleEphemeralResponse, embedMessageResponse, errorEmbed } from '#discord/responses.js';

import * as collection from '../collection.js';
import * as archive from '#commands/catcha/archive/archive.js';
import * as listUtils from '#commands/catcha/collection/list-utils.js';

async function getTitle(requestedBy: DAPI.APIUser, userId: string, searchingFor: string | number, env: Env) {
	let title = '';

	if (userId === requestedBy.id) {
		const discriminator = requestedBy.discriminator === '0' ? '' : `#${requestedBy.discriminator}`;
		title = `Searching ${requestedBy.username}${discriminator}'s collection for: "${searchingFor}"`;
	} else {
		const discordUserFromId = await discordUserApi.discordGetUser(env.DISCORD_TOKEN, userId);

		if (discordUserFromId) {
			const discriminator = discordUserFromId.discriminator === '0' ? '' : `#${discordUserFromId.discriminator}`;
			title = `Searching ${discordUserFromId.username}${discriminator}'s collection for: "${searchingFor}"`;
		} else {
			title = `Searching ${userId}'s collection for: "${searchingFor}"`;
		}
	}

	return title;
}

async function search(
	env: Env,
	options: {
		searchTerm: string | number;
		userId: string;

		onlyRarity?: number;
		onlyInverted?: boolean;
		onlyVariant?: boolean;
	},
): Promise<string[]> {
	const searchTerm = options.searchTerm;
	let onlyCardIds: number[] = [];

	if (typeof searchTerm === 'string') {
		onlyCardIds = archive.searchForCardIds(searchTerm);
	} else {
		onlyCardIds.push(searchTerm);
	}

	const userCollection = await collection.getCollection(options.userId, env, {
		rarity: options.onlyRarity,
		onlyInverted: options.onlyInverted,
		onlyVariant: options.onlyVariant,
		onlyCardIds: onlyCardIds,
	});

	if (userCollection.length === 0) return [];

	const searchResults = listUtils.stringifyCollection(userCollection);

	return searchResults;
}

async function handleLocateScroll(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[],
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const pageData = parsedCustomId[2];
	const listDataString = parsedCustomId[3];
	const listData = listUtils.parseListDataString(listDataString);

	if (interaction.message.embeds[0] && interaction.message.embeds[0].title) {
		const embedTitle = interaction.message.embeds[0].title;
		const searchTerm = embedTitle.split('"')[1];

		let locateCardId: number | undefined = Number.parseInt(searchTerm);
		if (isNaN(locateCardId)) {
			locateCardId = undefined;
		}

		const searchResults = await search(env, {
			searchTerm: locateCardId ?? searchTerm,
			userId: listData.userId,

			onlyRarity: listData.onlyRarity,
			onlyInverted: listData.onlyInverted,
			onlyVariant: listData.onlyVariant,
		});

		if (searchResults.length === 0) {
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
			action: 'catcha/locate',
			pageData,
			listDataString,

			items: searchResults,

			title: interaction.message.embeds[0]?.title,
			author: listUtils.getRequestedByAuthor(user, listData.userId),
		});

		return messageResponse({
			embeds: [newList.embed],
			components: newList.scrollActionRow !== undefined ? [newList.scrollActionRow] : undefined,
			update: true,
		});
	} else {
		return simpleEphemeralResponse('Cannot find the search term.');
	}
}

async function handleLocateSubcommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const searchTerm = commandOptions[0].value as string;

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

	let locateCardId: number | undefined = Number.parseInt(searchTerm);
	if (isNaN(locateCardId)) {
		locateCardId = undefined;
	}

	if (pageNumber < 1) return simpleEphemeralResponse('The page number cannot be less than 1.');

	const searchResults = await search(env, {
		searchTerm: locateCardId ?? searchTerm,
		userId: listUserId,

		onlyRarity,
		onlyInverted,
		onlyVariant,
	});

	if (searchResults.length === 0) {
		return embedMessageResponse(
			errorEmbed(
				'No cards found.',
				await getTitle(user, listUserId, searchTerm, env),
				listUtils.getRequestedByAuthor(user, listUserId),
			),
		);
	}

	const list = listMessage.createListMessage({
		action: 'catcha/locate',
		listDataString: listUtils.buildListDataString(listUserId, onlyRarity, onlyInverted, onlyVariant),

		items: searchResults,
		pageNumber,

		title: await getTitle(user, listUserId, searchTerm, env),
		author: listUtils.getRequestedByAuthor(user, listUserId),
	});

	return messageResponse({
		embeds: [list.embed],
		components: list.scrollActionRow !== undefined ? [list.scrollActionRow] : undefined,
	});
}

export { handleLocateSubcommand, handleLocateScroll };
