import * as DAPI from 'discord-api-types/v10';

import * as archive from '#commands/catcha/archive/archive.js';
import * as enums from '#commands/catcha/catcha-enums.js';
import * as starString from '#commands/catcha/utils/star-string.js';

import * as defer from '#discord/responses-deferred.js';

import type { Collection } from './collection.js';
import type { CatchaCard } from '@prisma/client';

import * as config from '#config.js';

function getRequestedByAuthor(requestedBy: DAPI.APIUser, userId: string) {
	let author: DAPI.APIEmbedAuthor | undefined = undefined;

	if (requestedBy.id !== userId) {
		author = {
			name: `Requested by: ${requestedBy.username}${requestedBy.discriminator === '0' ? '' : '#' + requestedBy.discriminator}`,
			icon_url: `https://cdn.discordapp.com/avatars/${requestedBy.id}/${requestedBy.avatar}.webp`,
		};
	}

	return author;
}

function stringifyCards(cards: CatchaCard[]) {
	const stringifiedCards: string[] = [];

	for (let i = 0; i < cards.length; i++) {
		const card = cards[i];
		const variant = card.variant;

		const cardId = card.cardId;
		const isInverted = card.isInverted;
		const cardDetails = archive.getCardDetailsById(cardId)!;
		const rarity = cardDetails.rarity;

		stringifiedCards.push(
			`[#${cardId}] ${archive.getCardFullName(cardId, isInverted, variant ?? undefined)} ${starString.createStarString(rarity, isInverted)}`,
		);
	}

	return stringifiedCards;
}

function stringifyCollection(collection: Collection) {
	const stringifiedCards: string[] = [];

	for (let i = 0; i < collection.length; i++) {
		const card = collection[i];
		const position = card.position;
		const variant = card.card.variant;

		const cardId = card.card.cardId;
		const isInverted = card.card.isInverted;
		const cardDetails = archive.getCardDetailsById(cardId)!;
		const rarity = cardDetails.rarity;

		stringifiedCards.push(
			`[${position}] [#${cardId}] ${archive.getCardFullName(cardId, isInverted, variant ?? undefined)} ${starString.createStarString(rarity, isInverted)}`,
		);
	}

	return stringifiedCards;
}

function parseSearchOptions(options: DAPI.APIApplicationCommandInteractionDataBasicOption[]) {
	let userId: string | undefined;
	let page: number | undefined;
	let onlyRarity: number | undefined;
	let onlyInverted: boolean | undefined;
	let onlyVariant: boolean | undefined;

	for (const option of options) {
		switch (option.name) {
			case enums.ListSubcommandOption.User:
				if (option.type === DAPI.ApplicationCommandOptionType.User) userId = option.value;
				continue;
			case enums.ListSubcommandOption.Page:
				if (option.type === DAPI.ApplicationCommandOptionType.Integer) page = option.value;
				continue;
			case enums.ListSubcommandOption.Rarity:
				if (option.type === DAPI.ApplicationCommandOptionType.Integer) onlyRarity = option.value;
				continue;
			case enums.ListSubcommandOption.OnlyInverted:
				if (option.type === DAPI.ApplicationCommandOptionType.Boolean) onlyInverted = option.value;
				continue;
			case enums.ListSubcommandOption.OnlyVariant:
				if (option.type === DAPI.ApplicationCommandOptionType.Boolean) onlyVariant = option.value;
				continue;
			default:
				continue;
		}
	}

	return {
		userId: userId,
		page: page,
		onlyRarity: onlyRarity,
		onlyInverted: onlyInverted,
		onlyVariant: onlyVariant,
	};
}

function buildListDataString(userId: string, onlyRarity?: number, onlyInverted?: boolean, onlyVariant?: boolean) {
	let onlyInvertedString = '';
	let onlyVariantString = '';

	if (onlyInverted !== undefined) {
		onlyInvertedString = onlyInverted ? '1' : '0';
	}

	if (onlyVariant !== undefined) {
		onlyVariantString = onlyVariant ? '1' : '0';
	}

	return `${userId},${onlyRarity ?? '0'},${onlyInvertedString},${onlyVariantString}`;
}

function parseListDataString(dataString: string) {
	const listData = dataString.split(',');

	const listUserId = listData[0];
	const onlyRarity = listData[1] !== '0' ? Number.parseInt(listData[1]) : undefined;
	const onlyInverted = listData[2] === '' ? undefined : Boolean(Number.parseInt(listData[2]));
	const onlyVariant = listData[3] === '' ? undefined : Boolean(Number.parseInt(listData[3]));

	return {
		userId: listUserId,
		onlyRarity: onlyRarity,
		onlyInverted: onlyInverted,
		onlyVariant: onlyVariant,
	};
}

export {
	getRequestedByAuthor,
	stringifyCards,
	stringifyCollection,
	parseSearchOptions,
	buildListDataString,
	parseListDataString,
};
