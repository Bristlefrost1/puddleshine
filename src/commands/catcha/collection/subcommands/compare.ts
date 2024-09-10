import * as DAPI from 'discord-api-types/v10';

import * as listMessage from '#discord/list-message.js';
import * as discordUserApi from '#discord/api/discord-user.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import { messageResponse, simpleEphemeralResponse, embedMessageResponse, errorEmbed } from '#discord/responses.js';

import * as enums from '#commands/catcha/catcha-enums.js';

import * as collection from '#commands/catcha/collection/collection.js';
import * as archive from '#commands/catcha/archive/archive.js';
import * as listUtils from '#commands/catcha/collection/list-utils.js';
import { createStarString } from '#commands/catcha/utils/star-string.js';
import { CompareSort, compareSortChoices, sortCompareFoundCards } from '#commands/catcha/utils/sort.js';

import type { Subcommand } from '#commands/subcommand.js';

import * as config from '#config.js';

type CompareFoundCard = { cardId: number; isInverted: boolean; count: number };

const SUBCOMMAND_NAME = 'compare';

async function getTitle(
	requestedBy: DAPI.APIUser,
	userId: string,
	compareToUserId: string,
	onlyDuplicates: boolean,
	env: Env,
) {
	const what = onlyDuplicates ? 'duplicates' : 'collection';

	let username: string | undefined;
	let compareToUsername: string | undefined;

	if (userId === requestedBy.id) {
		const discriminator = requestedBy.discriminator === '0' ? '' : `#${requestedBy.discriminator}`;
		username = `${requestedBy.username}${discriminator}`;
	} else {
		const discordUserFromId = await discordUserApi.discordGetUser(env.DISCORD_TOKEN, userId);

		if (discordUserFromId) {
			const discriminator = discordUserFromId.discriminator === '0' ? '' : `#${discordUserFromId.discriminator}`;
			username = `${discordUserFromId.username}${discriminator}`;
		} else {
			username = userId;
		}
	}

	if (compareToUserId === requestedBy.id) {
		const discriminator = requestedBy.discriminator === '0' ? '' : `#${requestedBy.discriminator}`;
		compareToUsername = `${requestedBy.username}${discriminator}`;
	} else {
		const discordUserFromId = await discordUserApi.discordGetUser(env.DISCORD_TOKEN, compareToUserId);

		if (discordUserFromId) {
			const discriminator = discordUserFromId.discriminator === '0' ? '' : `#${discordUserFromId.discriminator}`;
			compareToUsername = `${discordUserFromId.username}${discriminator}`;
		} else {
			compareToUsername = compareToUserId;
		}
	}

	return `\`${username}\`'s remaining cards found in \`${compareToUsername}\`'s ${what}`;
}

function buildListDataString(
	userDiscordId: string,
	compareToDiscordId: string,
	onlyRarity?: number,
	onlyInverted?: boolean,
	onlyDuplicates?: boolean,
	sort?: CompareSort,
) {
	let onlyInvertedString = '';
	let onlyDuplicatesString = '';

	if (onlyInverted !== undefined) {
		onlyInvertedString = onlyInverted ? '1' : '0';
	}

	if (onlyDuplicates !== undefined) {
		onlyDuplicatesString = onlyDuplicates ? '1' : '0';
	}

	return `${userDiscordId},${compareToDiscordId},${onlyRarity ?? '0'},${onlyInvertedString},${onlyDuplicatesString},${sort ?? ''}`;
}

function parseListDataString(dataString: string) {
	const listData = dataString.split(',');

	const userDiscordId = listData[0];
	const compareToDiscordId = listData[1];
	const onlyRarity = listData[2] !== '0' ? Number.parseInt(listData[2]) : undefined;
	const onlyInverted = listData[3] === '' ? undefined : Boolean(Number.parseInt(listData[3]));
	const onlyDuplicates = listData[4] === '' ? undefined : Boolean(Number.parseInt(listData[4]));
	const sort: CompareSort | undefined = listData[5] === '' ? undefined : (listData[5] as any);

	return {
		userDiscordId,
		compareToDiscordId,
		onlyRarity,
		onlyInverted,
		onlyDuplicates,
		sort,
	};
}

async function listComparison(options: {
	userDiscordId: string;
	compareToDiscordId: string;

	onlyInverted: boolean;
	onlyRarity?: number;

	onlyDuplicates: boolean;

	sort: CompareSort;

	env: Env;
}) {
	const foundCards: CompareFoundCard[] = [];

	const cardCounts = await collection.getCardCounts(options.compareToDiscordId, options.env, {
		rarity: options.onlyRarity,
		onlyInverted: options.onlyInverted,
		onlyVariant: false,
	});

	if (cardCounts.size === 0) return 'NoCardsFound';

	const userRemainingCardIds = await collection.getRemainingCardIds(options.userDiscordId, options.env, {
		onlyRarity: options.onlyRarity,
		onlyInverted: options.onlyInverted,
	});

	if (userRemainingCardIds.length === 0) return 'NoRemainings';

	for (const [cardKey, count] of cardCounts) {
		const cardKeyDetails = collection.parseCardKey(cardKey);

		if (cardKeyDetails.inverted !== options.onlyInverted) continue;
		if (options.onlyDuplicates && count < 2) continue;

		if (userRemainingCardIds.includes(cardKeyDetails.cardId)) {
			foundCards.push({
				cardId: cardKeyDetails.cardId,
				isInverted: cardKeyDetails.inverted,
				count,
			});
		}
	}

	if (foundCards.length === 0) return [];

	const lines = sortCompareFoundCards(foundCards, options.sort).map((card) => {
		const cardDetails = archive.getCardDetailsById(card.cardId)!;

		return `[#${card.cardId}] x${card.count}  ${archive.getCardFullName(card.cardId, card.isInverted)} ${createStarString(cardDetails.rarity, card.isInverted)}`;
	});

	return lines;
}

const CompareSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Compare two collections and show which cards are missing from the other.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.User,
				name: 'user',
				description: 'The user whose remainings to search for (defaults to you)',
				required: false,
			},
			{
				type: DAPI.ApplicationCommandOptionType.User,
				name: 'compare_to',
				description: 'The collection in which to search for the remaining cards (defaults to you)',
				required: false,
			},
			{
				type: DAPI.ApplicationCommandOptionType.Boolean,
				name: 'only_duplicates',
				description: 'Only count duplicates when determining which remaining cards the user has',
				required: false,
			},
			{
				type: DAPI.ApplicationCommandOptionType.Integer,
				name: enums.ListSubcommandOption.Page,
				description: 'The page to view',
				required: false,
			},
			{
				type: DAPI.ApplicationCommandOptionType.Integer,
				name: enums.ListSubcommandOption.Rarity,
				description: 'Only show cards of this rarity',
				required: false,
				choices: [
					{ name: enums.RarityString.OneStar, value: 1 },
					{ name: enums.RarityString.TwoStars, value: 2 },
					{ name: enums.RarityString.ThreeStars, value: 3 },
					{ name: enums.RarityString.FourStars, value: 4 },
					{ name: enums.RarityString.FiveStars, value: 5 },
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Boolean,
				name: enums.ListSubcommandOption.OnlyInverted,
				description: 'Only show inverted (flipped) cards',
				required: false,
			},
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: enums.ListSubcommandOption.Sort,
				description: 'Choose how to sort the cards',
				required: false,

				choices: compareSortChoices,
			},
		],
	},

	async execute(options) {
		const {
			user: userOption,
			compare_to: compareToOption,
			only_duplicates: onlyDuplicatesOption,
		} = parseCommandOptions(options.commandOptions);

		let userDiscordId: string | undefined;
		let compareToDiscordId: string | undefined;

		let onlyDuplicates = false;

		if (userOption) userDiscordId = userOption.value as string;
		if (compareToOption) compareToDiscordId = compareToOption.value as string;

		if (userDiscordId === undefined && compareToDiscordId === undefined)
			return simpleEphemeralResponse('Either `user` or `compare_to` is required,');

		if (!userDiscordId) userDiscordId = options.user.id;
		if (!compareToDiscordId) compareToDiscordId = options.user.id;

		if (userDiscordId === compareToDiscordId)
			return simpleEphemeralResponse('The `user` and `compare_to` options may not be the same.');

		if (onlyDuplicatesOption && onlyDuplicatesOption.type === DAPI.ApplicationCommandOptionType.Boolean)
			onlyDuplicates = onlyDuplicatesOption.value;

		const searchOptions = listUtils.parseSearchOptions(options.commandOptions!);
		const sort = (searchOptions.sort as unknown as CompareSort) ?? CompareSort.DuplicatesDesc;

		const comparisonList = await listComparison({
			userDiscordId,
			compareToDiscordId,
			onlyRarity: searchOptions.onlyRarity,
			onlyInverted: searchOptions.onlyInverted ?? false,
			onlyDuplicates,
			sort,
			env: options.env,
		});

		if (comparisonList === 'NoCardsFound') {
			return embedMessageResponse(errorEmbed("Couldn't find any cards to compare the remainings to."));
		} else if (comparisonList === 'NoRemainings') {
			let message = '';

			if (userDiscordId === options.user.id) {
				message = '🎉 No remaining cards found. Congratulations!';
			} else {
				message = '🎉 No remaining cards found.';
			}

			return embedMessageResponse({
				color: config.INVERTED_COLOR,
				description: message,
			});
		}

		const list = listMessage.createListMessage({
			action: 'catcha/compare',
			listDataString: buildListDataString(
				userDiscordId,
				compareToDiscordId,
				searchOptions.onlyRarity,
				searchOptions.onlyInverted,
				onlyDuplicates,
				sort,
			),

			items: comparisonList,
			pageNumber: searchOptions.page ?? 1,

			title: await getTitle(options.user, userDiscordId, compareToDiscordId, onlyDuplicates, options.env),
			author: listUtils.getRequestedByAuthor(options.user, userDiscordId),
		});

		return messageResponse({
			embeds: [list.embed],
			components: list.scrollActionRow !== undefined ? [list.scrollActionRow] : undefined,
		});
	},

	async handleMessageComponent(options) {
		if (!options.interaction.message.embeds[0]) return simpleEphemeralResponse('No embed found.');

		const pageData = options.parsedCustomId[2];
		const listDataString = options.parsedCustomId[3];
		const listData = parseListDataString(listDataString);

		const comparisonList = await listComparison({
			userDiscordId: listData.userDiscordId,
			compareToDiscordId: listData.compareToDiscordId,
			onlyRarity: listData.onlyRarity,
			onlyInverted: listData.onlyInverted ?? false,
			onlyDuplicates: listData.onlyDuplicates ?? false,
			sort: listData.sort ?? CompareSort.DuplicatesDesc,
			env: options.env,
		});

		if (comparisonList === 'NoCardsFound') {
			return messageResponse({
				embeds: [errorEmbed("Couldn't find any cards to compare the remainings to.")],
				update: true,
			});
		} else if (comparisonList === 'NoRemainings') {
			let message = '';

			if (listData.userDiscordId === options.user.id) {
				message = '🎉 No remaining cards found. Congratulations!';
			} else {
				message = '🎉 No remaining cards found.';
			}

			return messageResponse({
				embeds: [
					{
						color: config.INVERTED_COLOR,
						description: message,
					},
				],
				update: true,
			});
		}

		const newList = listMessage.scrollListMessage({
			action: 'catcha/compare',
			pageData,
			listDataString,

			items: comparisonList,

			title: options.interaction.message.embeds[0].title,
			author: listUtils.getRequestedByAuthor(options.user, listData.userDiscordId),
		});

		return messageResponse({
			embeds: [newList.embed],
			components: newList.scrollActionRow !== undefined ? [newList.scrollActionRow] : undefined,
			update: true,
		});
	},
};

export default CompareSubcommand;
export type { CompareFoundCard };
