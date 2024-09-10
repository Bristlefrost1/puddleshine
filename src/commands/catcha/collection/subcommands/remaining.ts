import * as DAPI from 'discord-api-types/v10';

import * as discordUserApi from '#discord/api/discord-user.js';
import * as listMessage from '#discord/list-message.js';
import { messageResponse, simpleEphemeralResponse, embedMessageResponse, errorEmbed } from '#discord/responses.js';

import * as collection from '../collection.js';
import * as archive from '#commands/catcha/archive/archive.js';
import * as listUtils from '#commands/catcha/collection/list-utils.js';
import { createStarString } from '#commands/catcha/utils/star-string.js';

import * as config from '#config.js';

async function getTitle(requestedBy: DAPI.APIUser, userId: string, env: Env) {
	let title = '';

	if (userId === requestedBy.id) {
		const discriminator = requestedBy.discriminator === '0' ? '' : `#${requestedBy.discriminator}`;
		title = `${requestedBy.username}${discriminator}'s remaining cards`;
	} else {
		const discordUserFromId = await discordUserApi.discordGetUser(env.DISCORD_TOKEN, userId);

		if (discordUserFromId) {
			const discriminator = discordUserFromId.discriminator === '0' ? '' : `#${discordUserFromId.discriminator}`;
			title = `${discordUserFromId.username}${discriminator}'s remaining cards`;
		} else {
			title = `${userId}'s remaining cards`;
		}
	}

	return title;
}

function createCongratulationsMessage(
	user: DAPI.APIUser,
	userId?: string,
	onlyRarity?: number,
	onlyInverted?: boolean,
) {
	let userHas = '';
	let inverted = '';

	if (user.id === userId) {
		userHas = '🎉 Congratulations! You have';
	} else {
		userHas = 'This user has';
	}

	if (onlyInverted) {
		inverted = 'inverted ';
	}

	if (onlyRarity !== undefined) {
		return `${userHas} all of the ${inverted}cards of this rarity.`;
	} else {
		return `${userHas} all of the ${inverted}cards.`;
	}
}

async function listRemaining(
	env: Env,
	options: {
		userId: string;

		onlyRarity?: number;
		onlyInverted?: boolean;
	},
): Promise<string[]> {
	const onlyInverted = options.onlyInverted ?? false;

	const remainingCardIds = await collection.getRemainingCardIds(options.userId, env, {
		onlyRarity: options.onlyRarity,
		onlyInverted: options.onlyInverted,
	});
	const remainingList: string[] = [];

	remainingCardIds.forEach((cardId) => {
		const cardDetails = archive.getCardDetailsById(cardId)!;

		remainingList.push(
			`[#${cardId}] ${archive.getCardFullName(cardId, onlyInverted)} ${createStarString(cardDetails.rarity, onlyInverted)}`,
		);
	});

	return remainingList;
}

async function handleRemainingScroll(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[],
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const pageData = parsedCustomId[2];
	const listDataString = parsedCustomId[3];
	const listData = listUtils.parseListDataString(listDataString);

	const remainingList = await listRemaining(env, {
		userId: listData.userId,
		onlyRarity: listData.onlyRarity,
		onlyInverted: listData.onlyInverted,
	});

	if (remainingList.length === 0) {
		return messageResponse({
			embeds: [
				{
					color: config.INVERTED_COLOR,
					description: createCongratulationsMessage(
						user,
						listData.userId,
						listData.onlyRarity,
						listData.onlyInverted,
					),
				},
			],
			update: true,
		});
	}

	const newList = listMessage.scrollListMessage({
		action: 'catcha/remaining',
		pageData,
		listDataString,

		items: remainingList,

		title: interaction.message.embeds[0]?.title,
		author: listUtils.getRequestedByAuthor(user, listData.userId),
	});

	return messageResponse({
		embeds: [newList.embed],
		components: newList.scrollActionRow !== undefined ? [newList.scrollActionRow] : undefined,
		update: true,
	});
}

async function handleRemainingSubcommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined,
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	// Set the defaults
	let listUserId = user.id;
	let pageNumber = 1;
	let onlyRarity: number | undefined;
	let onlyInverted: boolean | undefined;

	// Parse the options
	if (commandOptions) {
		const searchOptions = listUtils.parseSearchOptions(commandOptions);

		listUserId = searchOptions.userId ?? listUserId;
		pageNumber = searchOptions.page ?? pageNumber;
		onlyRarity = searchOptions.onlyRarity;
		onlyInverted = searchOptions.onlyInverted;
	}

	if (pageNumber < 1) return simpleEphemeralResponse('The page number cannot be less than 1.');

	const remainingList = await listRemaining(env, {
		userId: listUserId,
		onlyRarity: onlyRarity,
		onlyInverted: onlyInverted,
	});

	if (remainingList.length === 0) {
		return messageResponse({
			embeds: [
				{
					color: config.INVERTED_COLOR,
					description: createCongratulationsMessage(user, listUserId, onlyRarity, onlyInverted),
				},
			],
		});
	}

	const list = listMessage.createListMessage({
		action: 'catcha/remaining',
		listDataString: listUtils.buildListDataString(listUserId, onlyRarity, onlyInverted),

		items: remainingList,
		pageNumber,

		title: await getTitle(user, listUserId, env),
		author: listUtils.getRequestedByAuthor(user, listUserId),
	});

	return messageResponse({
		embeds: [list.embed],
		components: list.scrollActionRow !== undefined ? [list.scrollActionRow] : undefined,
	});
}

export { handleRemainingSubcommand, handleRemainingScroll };
