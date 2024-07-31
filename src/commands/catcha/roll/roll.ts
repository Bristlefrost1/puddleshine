import * as DAPI from 'discord-api-types/v10';

import { errorEmbed, embedMessageResponse } from '#discord/responses.js';
import * as archive from '#commands/catcha/archive/archive.js';
import * as collection from '#commands/catcha/collection/collection.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import * as rollPeriod from './roll-period.js';
import * as randomizer from './randomizer.js';
import { randomArt } from '../art/art.js';
import { createStarString } from '#commands/catcha/utils/star-string.js';

import * as config from '#config.js';

type Catcha = NonNullable<Awaited<ReturnType<typeof catchaDB.findCatcha>>>;

function buildWelcomeEmbed(username: string, discriminator: string): DAPI.APIEmbed {
	return {
		color: config.INFO_COLOR,
		description: `Welcome to Catcha, ${username}${discriminator === '0' ? '' : '#' + discriminator}! If you need help, join the Puddleshine Community Discord. Start by resending the command.`,
	};
}

function hasRecentlyClaimed(catcha: Catcha, currentRollPeriod: number) {
	if (!catcha.lastClaim) return { hasClaimedRecently: false, claimCooldownEnd: undefined };

	const lastClaimTimestamp = Math.floor(catcha.lastClaim.getTime() / 1000);
	const lastClaimRollPeriod = rollPeriod.getRollPeriodFromUnixTime(lastClaimTimestamp);

	if (lastClaimRollPeriod >= currentRollPeriod - config.CATCHA_CLAIM_COOLDOWN_PERIODS) {
		const cooldownEndPeriod = lastClaimRollPeriod + config.CATCHA_CLAIM_COOLDOWN_PERIODS + 1;
		const cooldownEndUnixTime = cooldownEndPeriod * 60 * 60 + rollPeriod.ROLL_PERIOD_EPOCH;

		return {
			hasClaimedRecently: true,
			claimCooldownEnd: cooldownEndUnixTime,
		};
	}

	return { hasClaimedRecently: false, claimCooldownEnd: undefined };
}

function hasAlreadyRolledMaxTimes(catcha: Catcha, currentRollPeriod: number) {
	if (catcha.lastRollPeriod === currentRollPeriod) {
		if (catcha.lastRollCount && catcha.lastRollCount >= config.CATCHA_MAX_ROLLS) {
			return true;
		}
	}

	return false;
}

async function onRoll(
	interaction: DAPI.APIApplicationCommandInteraction | DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const currentRollPeriod = rollPeriod.getCurrentRollPeriod();
	const nextRollPeriod = currentRollPeriod + 1;
	const nextRollPeriodTimestamp = nextRollPeriod * 60 * 60 + rollPeriod.ROLL_PERIOD_EPOCH;
	const secondsUntilNextRollPeriod = nextRollPeriodTimestamp - Math.floor(new Date().getTime() / 1000);

	const userCatcha = await catchaDB.findCatcha(env.PRISMA, user.id);

	if (!userCatcha) {
		// A new user, initialize their Catcha and send a welcome message
		await catchaDB.initializeCatchaForUser(env.PRISMA, user.id);

		return embedMessageResponse(buildWelcomeEmbed(user.username, user.discriminator));
	}

	// Make sure the user can roll this period
	const { hasClaimedRecently, claimCooldownEnd } = hasRecentlyClaimed(userCatcha, currentRollPeriod);
	const rolledMaxTimes = hasAlreadyRolledMaxTimes(userCatcha, currentRollPeriod);

	if (hasClaimedRecently && env.ENV !== 'dev') {
		return embedMessageResponse(
			errorEmbed(
				`You've recently claimed a card ${user.username} and are now on cooldown. You'll be able to roll again at <t:${claimCooldownEnd}:t>.`,
			),
		);
	}

	if (rolledMaxTimes && env.ENV !== 'dev') {
		return embedMessageResponse(
			errorEmbed(
				`You've already rolled ${config.CATCHA_MAX_ROLLS} times in this roll period, ${user.username}! The next roll period starts at <t:${nextRollPeriodTimestamp}:t>.`,
			),
		);
	}

	// Figure out the current roll
	const currentRoll = userCatcha.lastRollPeriod === currentRollPeriod ? (userCatcha.lastRollCount ?? 0) + 1 : 1;

	// Alright, the user can roll. Let's randomize a card for them
	const { cardId: randomCardId, variant, variantIndex } = await randomizer.randomizeCard(env);

	const cardsAlreadyInCollection = await collection.getCollection(user.id, env, {
		onlyVariant: variant !== undefined,
		onlyVariantIds: variant !== undefined ? [variant] : undefined,
		onlyCardIds: [randomCardId],
	});

	const normalCardsAlreadyInCollection: typeof cardsAlreadyInCollection = [];
	const invertedCardsAlreadyInCollection: typeof cardsAlreadyInCollection = [];

	cardsAlreadyInCollection.forEach((card) => {
		if (card.card.isInverted) {
			invertedCardsAlreadyInCollection.push(card);
		} else {
			normalCardsAlreadyInCollection.push(card);
		}
	});

	const normalDuplicates = normalCardsAlreadyInCollection.length;
	const invertedDuplicates = invertedCardsAlreadyInCollection.length;

	const isInverted = randomizer.randomizeInverted(normalDuplicates);
	const duplicates = isInverted ? invertedDuplicates : normalDuplicates;

	// Construct a roll embed
	const cardDetails = archive.getCardDetailsById(randomCardId)!;
	const cardFullName = archive.getCardFullName(randomCardId, isInverted, variantIndex);
	const cardShortName = archive.getCardShortName(randomCardId, isInverted, variantIndex, true);
	const starString = createStarString(cardDetails.rarity, isInverted);
	const art = randomArt(randomCardId, isInverted, variantIndex);

	const descriptionLines: string[] = [];

	if (secondsUntilNextRollPeriod <= 300) {
		// Less than 5 min until the next roll period
		const min = Math.floor(secondsUntilNextRollPeriod / 60);
		const sec = secondsUntilNextRollPeriod - min * 60;
		descriptionLines.push(
			`> The next roll period starts in${min > 0 ? ` ${min}m` : ''}${sec > 0 ? ` ${sec}s` : ''}.`,
		);
	}

	if (duplicates > 0) {
		if (duplicates === 1) {
			descriptionLines.push(`> You already have ${cardShortName} in your collection.`);
		} else {
			descriptionLines.push(`> You already have ${duplicates} ${cardShortName}s in your collection.`);
		}
	}

	if (isInverted) {
		descriptionLines.push(`> **A rare inverted (flipped) card!**`);
	}

	if (variantIndex !== undefined) {
		descriptionLines.push(
			`> **A rare ${variant} variant of ${archive.getCardShortName(randomCardId, false, undefined, true)}!**`,
		);

		if (cardDetails.variants![variantIndex].description) {
			descriptionLines.push('\n');
			descriptionLines.push(cardDetails.variants![variantIndex].description);
		}
	}

	const embedColor = archive.getCardColor(isInverted, variantIndex !== undefined);
	const timestamp = new Date().toISOString();

	// Set up the message components
	const components: DAPI.APIMessageActionRowComponent[] = [];

	components.push({
		type: DAPI.ComponentType.Button,
		label: '❤️ Claim',
		style: DAPI.ButtonStyle.Primary,
		custom_id: `catcha/claim/${user.id},${randomCardId},${isInverted ? '1' : '0'},${variantIndex ?? ''}`, // userId,cardId,inverted,variant
	});

	if (currentRoll < config.CATCHA_MAX_ROLLS || env.ENV === 'dev') {
		components.push({
			type: DAPI.ComponentType.Button,
			label: '🎲 Roll',
			style: DAPI.ButtonStyle.Secondary,
			custom_id: 'catcha/roll',
		});
	}

	// Update the user's Catcha to record the roll
	await catchaDB.updateCatcha(env.PRISMA, userCatcha.userUuid, {
		lastRollPeriod: currentRollPeriod,
		lastRollCount: currentRoll,
	});

	return {
		type: DAPI.InteractionResponseType.ChannelMessageWithSource,
		data: {
			embeds: [
				{
					author: { name: user.username },
					title: `${starString} ${cardFullName}`,
					color: embedColor,

					description: descriptionLines.length > 0 ? descriptionLines.join('\n') : undefined,

					image:
						art.artUrl !== undefined ?
							{
								url: art.artUrl,
								width: config.CATCHA_CARD_IMAGE_WIDTH,
							}
						:	undefined,

					footer: {
						text: `Roll ${currentRoll}/${config.CATCHA_MAX_ROLLS} | Card ID #${randomCardId} | ${art.artText}`,
					},
					timestamp: timestamp,
				},
			],
			components: [
				{
					type: DAPI.ComponentType.ActionRow,
					components: components,
				},
			],
		},
	};
}

export { onRoll, hasRecentlyClaimed };
