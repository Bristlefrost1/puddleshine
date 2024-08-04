import * as DAPI from 'discord-api-types/v10';

import { messageResponse, simpleEphemeralResponse, errorEmbed } from '#discord/responses.js';
import * as listMessage from '#discord/list-message.js';
import { discordGetUser } from '#discord/api/discord-user.js';

import * as collection from '../collection.js';
import * as archive from '#commands/catcha/archive/archive.js';
import * as artScroll from '#commands/catcha/art/art-scroll.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import { findUserWithUuid } from '#db/database.js';
import { randomArt, getVariantDataIndex } from '#commands/catcha/art/art.js';
import { createStarString } from '#commands/catcha/utils/star-string.js';

import * as config from '#config.js';

function buildCardEmbed(options: {
	ownerUsername?: string;

	cardId: number;
	cardUuid?: string;
	cardName: string;
	gender: string;
	clan: string;
	rarity: number;

	isInverted: boolean;

	variant?: string;
	variantDescription?: string;

	obtainedFrom?: string;
	obtainedAtUnixTime?: number;

	artUrl?: string;
	artText: string;
}): DAPI.APIEmbed {
	let title = '';

	if (options.ownerUsername !== undefined) {
		title = `${options.ownerUsername}'s ${options.cardName}`;
	} else {
		title = options.cardName;
	}

	const cardColor = archive.getCardColor(options.isInverted, options.variant !== undefined);
	const descriptionLines: string[] = [];

	descriptionLines.push(`Name: ${options.cardName}`);
	descriptionLines.push(`Clan: ${options.clan}`);
	descriptionLines.push(`Gender: ${options.gender}`);
	descriptionLines.push(`Rarity: ${createStarString(options.rarity, options.isInverted)} (${options.rarity})`);

	if (options.isInverted === true) {
		descriptionLines.push(`> **A rare inverted (flipped) card!**`);
	}

	if (options.variant !== undefined) {
		descriptionLines.push(
			`> **A rare ${options.variant} variant of ${archive.getCardShortName(options.cardId, false, undefined, true)}!**`,
		);
	}

	if (options.variantDescription !== undefined) {
		descriptionLines.push('\n');
		descriptionLines.push(options.variantDescription);
	}

	const embedFields: DAPI.APIEmbedField[] = [];

	embedFields.push({
		name: 'Card',
		value: `Card ID: ${options.cardId}${options.cardUuid !== undefined ? `\nCard UUID: ${options.cardUuid}` : ''}`,
		inline: false,
	});

	if (options.obtainedFrom !== undefined && options.obtainedAtUnixTime !== undefined) {
		embedFields.push({
			name: 'Obtained',
			value: `Obtained from: ${options.obtainedFrom}\nObtained at: <t:${options.obtainedAtUnixTime}:F> (<t:${options.obtainedAtUnixTime}:R>)`,
			inline: false,
		});
	}

	return {
		title: title,
		description: descriptionLines.join('\n'),
		color: cardColor,

		fields: embedFields,
		image:
			options.artUrl === undefined ?
				undefined
			:	{
					url: options.artUrl,
					width: config.CATCHA_CARD_IMAGE_WIDTH,
				},

		footer: {
			text: options.artText,
		},

		timestamp: new Date().toISOString(),
	};
}

async function viewCardHistory(cardUuid: string, env: Env): Promise<DAPI.APIInteractionResponse> {
	const title = 'Card History';

	const backButton: DAPI.APIButtonComponent = {
		type: DAPI.ComponentType.Button,
		custom_id: `catcha/view/card/${cardUuid}`,
		style: DAPI.ButtonStyle.Secondary,
		label: '← Back to Card',
	};

	const cardHistoryEvents = await catchaDB.getCardHistoryEvents(env.PRISMA, cardUuid);

	if (cardHistoryEvents.length === 0) {
		return messageResponse({
			embeds: [
				{
					title,
					color: config.ERROR_COLOR,
					description: "This card doesn't have any history to show.",
				},
			],
			components: [
				{
					type: DAPI.ComponentType.ActionRow,
					components: [backButton],
				},
			],
			update: true,
		});
	}

	const historyEventRows: string[] = [];

	for (const event of cardHistoryEvents) {
		const discordUserId = event.catcha?.user.discordId;
		const eventDate = event.timestamp;

		const eventTimestamp = Math.floor(eventDate.getTime() / 1000);

		switch (event.event) {
			case 'CLAIM':
				historyEventRows.push(`<t:${eventTimestamp}:f> - Claimed by <@${discordUserId}>`);
				break;
			case 'TRADE':
				historyEventRows.push(`<t:${eventTimestamp}:f> - Traded to <@${discordUserId}>`);
				break;
			case 'I':
				historyEventRows.push(`<t:${eventTimestamp}:f> - Imported for <@${discordUserId}>`);
				break;
			default:
			// Nothing
		}
	}

	const embedColor = archive.getCardColor(
		cardHistoryEvents[0].card.isInverted,
		cardHistoryEvents[0].card.variant !== null,
	);
	const historyString = historyEventRows.slice(0, 10).join('\n');

	return messageResponse({
		embeds: [
			{
				title,
				color: embedColor,
				description: historyString,
			},
		],
		components: [
			{
				type: DAPI.ComponentType.ActionRow,
				components: [backButton],
			},
		],
		allowedMentions: {
			users: [],
			roles: [],
		},
		update: true,
	});
}

async function viewCard(
	user: DAPI.APIUser,
	env: Env,
	viewCard: { by: 'position'; userId: string; position: number } | { by: 'uuid'; cardUuid: string },
	update?: boolean,
): Promise<DAPI.APIInteractionResponse> {
	let cardToView: Awaited<ReturnType<typeof catchaDB.findCardByUuid>>;
	let username: string | undefined;

	if (viewCard.by === 'uuid') {
		const card = await catchaDB.findCardByUuid(env.PRISMA, viewCard.cardUuid);

		if (!card) {
			return messageResponse({
				embeds: [errorEmbed(`No card found with the UUID ${viewCard.cardUuid}.`)],
				update,
			});
		}

		cardToView = card;

		const cardOwner = await findUserWithUuid(env.PRISMA, card.ownerUuid);

		if (cardOwner) {
			const ownerDiscordUser = await discordGetUser(env.DISCORD_TOKEN, cardOwner.discordId);

			if (ownerDiscordUser) {
				username = ownerDiscordUser.username;
			}
		}
	} else {
		const userCollection = await collection.getCollection(viewCard.userId, env);

		if (!userCollection) {
			return messageResponse({
				embeds: [errorEmbed(`No card found at position ${viewCard.position}.`)],
				update,
			});
		}

		const card = userCollection[viewCard.position - 1];

		if (!card) {
			return messageResponse({
				embeds: [errorEmbed(`No card found at position ${viewCard.position}.`)],
				update,
			});
		}

		cardToView = card.card;

		if (viewCard.userId === user.id) {
			username = user.username;
		} else {
			const user = await discordGetUser(env.DISCORD_TOKEN, viewCard.userId);

			if (user) {
				username = user.username;
			} else {
				username = viewCard.userId;
			}
		}
	}

	const cardId = cardToView.cardId;
	const cardUuid = cardToView.uuid;
	const isInverted = cardToView.isInverted;
	const variant = cardToView.variant;
	const obtainedAtUnixTime = Math.floor(cardToView.obtainedAt.getTime() / 1000);

	const cardDetails = archive.getCardDetailsById(cardId)!;

	let variantDataIndex: number | undefined;
	let variantDescription: string | undefined;
	if (variant) {
		variantDataIndex = getVariantDataIndex(cardDetails, variant);

		if (variantDataIndex !== undefined && cardDetails.variants && cardDetails.variants.length > 0) {
			if (cardDetails.variants[variantDataIndex])
				variantDescription = cardDetails.variants[variantDataIndex].description;
		}
	}

	let obtainedFrom = '';
	switch (cardToView.obtainedFrom) {
		case 'ROLL':
			obtainedFrom = 'Rolling';
			break;
		case 'TRADE':
			obtainedFrom = 'Trading';
			break;
		case 'I':
			obtainedFrom = 'Imported';
			break;
		default:
			obtainedFrom = cardToView.obtainedFrom;
	}

	const art = randomArt(cardId, isInverted, variant ?? undefined);

	let components: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[] = [];
	if (art.totalArt && art.artNumber && art.totalArt > 1) {
		components = artScroll.buildArtScrollComponents(cardId, art.artNumber, isInverted, variantDataIndex);
	}

	components.push({
		type: DAPI.ComponentType.ActionRow,
		components: [
			{
				type: DAPI.ComponentType.Button,
				custom_id: `catcha/view/history/${cardUuid}`,

				style: DAPI.ButtonStyle.Secondary,
				label: '📜 View Card History',
			},
		],
	});

	return messageResponse({
		embeds: [
			buildCardEmbed({
				ownerUsername: username,

				cardId,
				cardUuid,
				cardName: archive.getCardShortName(cardId, isInverted, variant ?? undefined, true),
				gender: cardDetails.gender === '' ? 'Unknown' : cardDetails.gender,
				clan: cardDetails.group,
				rarity: cardDetails.rarity,

				isInverted,
				variant: variant ?? undefined,
				variantDescription,

				obtainedFrom,
				obtainedAtUnixTime,

				artUrl: art.artUrl,
				artText: art.artText,
			}),
		],
		components: components,
		update,
	});
}

async function handleViewMessageComponent(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[],
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const action = parsedCustomId[2];

	if (action === 'card') {
		const cardUuid = parsedCustomId[3];

		return await viewCard(user, env, { by: 'uuid', cardUuid }, true);
	} else if (action === 'history') {
		const cardUuid = parsedCustomId[3];

		return await viewCardHistory(cardUuid, env);
	}

	return simpleEphemeralResponse('Unknown interaction.');
}

async function handleViewCommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	let userId = user.id;
	let position: number | undefined;

	// Parse options
	for (const option of commandOptions) {
		switch (option.name) {
			case 'position':
				if (option.type === DAPI.ApplicationCommandOptionType.Integer) position = option.value;
				continue;
			case 'user':
				if (option.type === DAPI.ApplicationCommandOptionType.User) userId = option.value;
				continue;
			default:
				continue;
		}
	}

	if (position === undefined) return simpleEphemeralResponse("You haven't entered a position.");

	return await viewCard(user, env, {
		by: 'position',
		userId,
		position,
	});
}

export { buildCardEmbed, handleViewCommand, handleViewMessageComponent };
