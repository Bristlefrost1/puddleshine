import * as DAPI from 'discord-api-types/v10';

import * as discordUserApi from '#discord/api/discord-user.js';
import * as listMessage from '#discord/list-message.js';
import { messageResponse, simpleEphemeralResponse, embedMessageResponse, errorEmbed } from '#discord/responses.js';

import * as collection from '../collection.js';
import * as archive from '#commands/catcha/archive/archive.js';
import { createStarString } from '#commands/catcha/utils/star-string.js';
import * as listUtils from '#commands/catcha/collection/list-utils.js';

import type { Card } from '../collection.js';

type CardCount = Pick<Card, 'cardId' | 'isInverted' | 'variant'> & {
	count: number;
};

async function getTitle(requestedBy: DAPI.APIUser, userId: string, env: Env) {
	let title = '';

	if (userId === requestedBy.id) {
		const discriminator = requestedBy.discriminator === '0' ? '' : `#${requestedBy.discriminator}`;
		title = `${requestedBy.username}${discriminator}'s duplicates`;
	} else {
		const discordUserFromId = await discordUserApi.discordGetUser(env.DISCORD_TOKEN, userId);

		if (discordUserFromId) {
			const discriminator = discordUserFromId.discriminator === '0' ? '' : `#${discordUserFromId.discriminator}`;
			title = `${discordUserFromId.username}${discriminator}'s duplicates`;
		} else {
			title = `${userId}'s duplicates`;
		}
	}

	return title;
}

async function listDuplicates(
	env: Env,
	options: {
		userId: string;

		onlyRarity?: number;
		onlyInverted?: boolean;
		onlyVariant?: boolean;
	},
): Promise<string[]> {
	const cardCounts = await collection.getCardCounts(options.userId, env, {
		rarity: options.onlyRarity,
		onlyInverted: options.onlyInverted,
		onlyVariant: options.onlyVariant,
	});

	if (cardCounts.size === 0) return [];

	const duplicates: { cardId: number; isInverted: boolean; variant?: string; count: number }[] = [];

	for (const [key, value] of cardCounts) {
		if (value > 1) {
			const cardKeyDetails = collection.parseCardKey(key);

			duplicates.push({
				cardId: cardKeyDetails.cardId,
				isInverted: cardKeyDetails.inverted,
				variant: cardKeyDetails.variant,
				count: value,
			});
		}
	}

	if (duplicates.length === 0) return [];

	const sortedDuplicates = duplicates.toSorted((a, b) => {
		if (b.count > a.count) {
			return 1;
		} else if (a.count > b.count) {
			return -1;
		} else {
			if (a.cardId === b.cardId) {
				return 0;
			} else {
				const aFullName = archive.getCardFullName(a.cardId);
				const bFullName = archive.getCardFullName(b.cardId);

				return aFullName.localeCompare(bFullName, 'en');
			}
		}
	});

	const duplicatesList: string[] = [];

	sortedDuplicates.forEach((card) => {
		const cardId = card.cardId;
		const isInverted = card.isInverted;
		const cardDetails = archive.getCardDetailsById(cardId)!;
		const rarity = cardDetails.rarity;

		duplicatesList.push(
			`[#${cardId}] x${card.count}  ${archive.getCardFullName(cardId, isInverted, card.variant)} ${createStarString(rarity, isInverted)}`,
		);
	});

	return duplicatesList;
}

async function handleDuplicatesScroll(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[],
	env: Env,
	ctx: ExecutionContext,
) {
	const pageData = parsedCustomId[2];
	const listDataString = parsedCustomId[3];
	const listData = listUtils.parseListDataString(listDataString);

	const duplicatesList = await listDuplicates(env, {
		userId: listData.userId,
		onlyRarity: listData.onlyRarity,
		onlyInverted: listData.onlyInverted,
		onlyVariant: listData.onlyVariant,
	});

	if (duplicatesList.length === 0) {
		return messageResponse({
			embeds: [
				errorEmbed(
					'No duplicates found.',
					interaction.message.embeds[0]?.title,
					listUtils.getRequestedByAuthor(user, listData.userId),
				),
			],
			update: true,
		});
	}

	const newList = listMessage.scrollListMessage({
		action: 'catcha/duplicates',
		pageData,
		listDataString,

		items: duplicatesList,

		title: interaction.message.embeds[0]?.title,
		author: listUtils.getRequestedByAuthor(user, listData.userId),
	});

	return messageResponse({
		embeds: [newList.embed],
		components: newList.scrollActionRow !== undefined ? [newList.scrollActionRow] : undefined,
		update: true,
	});
}

async function handleDuplicatesSubcommand(
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

	const duplicateList = await listDuplicates(env, {
		userId: listUserId,
		onlyRarity,
		onlyInverted,
		onlyVariant,
	});

	if (duplicateList.length === 0) {
		return embedMessageResponse(
			errorEmbed(
				'No duplicates found.',
				await getTitle(user, listUserId, env),
				listUtils.getRequestedByAuthor(user, listUserId),
			),
		);
	}

	const list = listMessage.createListMessage({
		action: 'catcha/duplicates',
		listDataString: listUtils.buildListDataString(listUserId, onlyRarity, onlyInverted, onlyVariant),

		items: duplicateList,
		pageNumber,

		title: await getTitle(user, listUserId, env),
		author: listUtils.getRequestedByAuthor(user, listUserId),
	});

	return messageResponse({
		embeds: [list.embed],
		components: list.scrollActionRow !== undefined ? [list.scrollActionRow] : undefined,
	});
}

export { handleDuplicatesSubcommand, handleDuplicatesScroll };
