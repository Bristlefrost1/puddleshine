import * as DAPI from 'discord-api-types/v10';

import { parseCommandOptions } from '#discord/parse-options.js';
import {
	messageResponse,
	simpleMessageResponse,
	simpleEphemeralResponse,
	embedMessageResponse,
	errorEmbed,
} from '#discord/responses.js';
import * as archive from '#commands/catcha/archive/archive.js';
import * as collection from '#commands/catcha/collection/collection.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import { stringifyCollection } from '#commands/catcha/collection/list-utils.js';

// Objectively the best ships of the entire series
// Why would anyone want to burn them?
const NON_FLAMMABLE_CARD_IDS = [
	117, // Bristlefrost
	891, // Rootspring

	325, // Nightheart
	1117, // Sunbeam

	481, // Ivypool
	306, // Fernsong
];

function resetEmbed(embed: DAPI.APIEmbed) {
	const newEmbed = embed;

	newEmbed.title = undefined;
	newEmbed.timestamp = undefined;
	newEmbed.footer = undefined;
	newEmbed.color = undefined;

	return newEmbed;
}

async function handleBurnMessageComponent(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[],
	env: Env,
	ctx: ExecutionContext,
) {
	const yesOrNo = parsedCustomId[2] as 'y' | 'n';
	const confirmationEmbed = interaction.message.embeds[0];
	const confirmationUserId = parsedCustomId[3];

	if (user.id !== confirmationUserId) return simpleEphemeralResponse('This is not your confirmation.');

	const confirmationTimestamp = confirmationEmbed.timestamp;

	if (
		!confirmationTimestamp ||
		Math.floor(new Date().getTime() / 1000) > Math.floor(Date.parse(confirmationTimestamp) / 1000) + 300
	) {
		return messageResponse({
			content: 'This confirmation has expired.',
			embeds: [resetEmbed(confirmationEmbed)],
			components: [],
			update: true,
		});
	}

	if (yesOrNo === 'y') {
		const userCatcha = await catchaDB.findCatcha(env.PRISMA, user.id);
		const userCollection = await collection.getCollection(user.id, env);

		if (!userCatcha || !userCollection || userCollection.length === 0) {
			return messageResponse({
				content: 'Your collection is empty.',
				embeds: [resetEmbed(confirmationEmbed)],
				components: [],
				update: true,
			});
		}

		const collectionString = confirmationEmbed.description!.slice(8, -3);
		const collectionLines = collectionString.split('\n');

		const cardUuidsToBurn: string[] = [];

		for (const line of collectionLines) {
			const splitLine = line.split(' ');

			const cardId = Number.parseInt(splitLine[1].replace('[', '').replace(']', '').replace('#', ''));
			const cardPosition = Number.parseInt(splitLine[0].replace('[', '').replace(']', ''));
			const cardIndex = cardPosition - 1;

			if (!userCollection[cardIndex] || userCollection[cardIndex].card.cardId !== cardId) {
				return messageResponse({
					content: `A card with ID ${cardId} couldn't be found at position ${cardPosition}.`,
					embeds: [resetEmbed(confirmationEmbed)],
					components: [],
					update: true,
				});
			}

			cardUuidsToBurn.push(userCollection[cardIndex].card.uuid);
		}

		await catchaDB.burnCardUuids(env.PRISMA, userCatcha.userUuid, cardUuidsToBurn);

		return messageResponse({
			content: 'Cards successfully burned.',
			embeds: [resetEmbed(confirmationEmbed)],
			components: [],
			update: true,
		});
	} else {
		return messageResponse({
			content: 'Cards not burned.',
			embeds: [resetEmbed(confirmationEmbed)],
			components: [],
			update: true,
		});
	}
}

async function handleBurn(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
) {
	const { cards: cardsOption } = parseCommandOptions(commandOptions);

	let cardsString = '';

	if (!cardsOption || cardsOption.type !== DAPI.ApplicationCommandOptionType.String)
		return simpleEphemeralResponse("You haven't provided the cards option.");

	cardsString = cardsOption.value;

	if (!cardsString || typeof cardsString !== 'string' || cardsString.trim() === '')
		return simpleEphemeralResponse("You haven't provided the cards option.");

	const cardPositions = cardsString
		.split(',')
		.map((value) => Number.parseInt(value.trim()))
		.filter((value) => !isNaN(value));

	const userCollection = await collection.getCollection(user.id, env);
	if (!userCollection || userCollection.length === 0)
		return simpleMessageResponse("You don't have any cards to burn.");

	const cardsToBurn: typeof userCollection = [];

	for (const cardPosition of cardPositions) {
		const cardIndex = cardPosition - 1;
		const card = userCollection[cardIndex];

		if (!card) return embedMessageResponse(errorEmbed(`There is no card at position ${cardPosition}.`));

		// Little easter egg
		if (NON_FLAMMABLE_CARD_IDS.includes(card.card.cardId)) {
			const cardDetails = archive.getCardDetailsById(card.card.cardId);

			return embedMessageResponse(errorEmbed(`What has ${cardDetails?.name} done to deserve to be burned?`));
		}

		if (card.card.pendingTradeUuid1 !== null || card.card.pendingTradeUuid2 !== null) {
			return embedMessageResponse(errorEmbed(`The card at position ${cardPosition} is in a pending trade.`));
		}

		cardsToBurn.push(card);
	}

	return embedMessageResponse(
		{
			title: 'Are you __really__ sure you wish to __burn these cards__?',

			description: `\`\`\`less\n${stringifyCollection(cardsToBurn).join('\n')}\`\`\``,

			footer: {
				text: 'This action cannot be undone | Confirm within 5 minutes to burn',
			},
			timestamp: new Date().toISOString(),
		},
		false,
		[
			{
				type: DAPI.ComponentType.ActionRow,
				components: [
					{
						type: DAPI.ComponentType.Button,
						custom_id: `catcha/burn/y/${user.id}`,
						style: DAPI.ButtonStyle.Danger,
						label: '🔥 Burn',
					},
					{
						type: DAPI.ComponentType.Button,
						custom_id: `catcha/burn/n/${user.id}`,
						style: DAPI.ButtonStyle.Primary,
						label: '❎ Cancel',
					},
				],
			},
		],
	);
}

export { handleBurn, handleBurnMessageComponent };
