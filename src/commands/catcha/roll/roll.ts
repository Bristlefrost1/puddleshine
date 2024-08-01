import * as DAPI from 'discord-api-types/v10';

import { errorEmbed, embedMessageResponse } from '#discord/responses.js';
import * as archive from '#commands/catcha/archive/archive.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import { getCurrentEvent } from '#commands/catcha/event/event.js';
import * as rollPeriod from './roll-period.js';
import * as randomizer from './randomizer.js';
import * as rollCache from './roll-cache.js';
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
	let randomCardId: number;
	let variant: string | undefined;
	let variantDataIndex: number | undefined;
	let isInverted: boolean;
	let alreadyInCollection: number;

	let setRollCache: string | undefined;

	const rollFromCache = rollCache.getRollFromCache(userCatcha, currentRoll); // First, check the cache

	if (rollFromCache) {
		randomCardId = rollFromCache.randomCardId;
		variant = rollFromCache.variant;
		variantDataIndex = rollFromCache.variantDataIndex;
		isInverted = rollFromCache.isInverted;
		alreadyInCollection = rollFromCache.alreadyInCollection;
	} else {
		const rebuiltCache = await rollCache.generateCache(user.id, userCatcha.userUuid, env);
		const rollFromRebultCache = rebuiltCache.rolls[currentRoll - 1];

		if (rollFromRebultCache) {
			randomCardId = rollFromRebultCache.randomCardId;
			variant = rollFromRebultCache.variant;
			variantDataIndex = rollFromRebultCache.variantDataIndex;
			isInverted = rollFromRebultCache.isInverted;
			alreadyInCollection = rollFromRebultCache.alreadyInCollection;

			setRollCache = JSON.stringify(rebuiltCache);
		} else {
			const currentEvent = await getCurrentEvent(env);
			const randomCard = randomizer.randomizeCard(currentEvent);

			let alreadyHasCards = await catchaDB.findUserCardsWithCardId(
				env.PRISMA,
				userCatcha.userUuid,
				randomCard.cardId,
			);

			if (randomCard.variant) {
				alreadyHasCards = alreadyHasCards.filter((card) => card.variant === randomCard.variant);
			} else {
				alreadyHasCards = alreadyHasCards.filter((card) => card.variant === null);
			}

			const alreadyHasNormal = alreadyHasCards.filter((card) => card.isInverted === false).length;
			const alreadyHasInverted = alreadyHasCards.filter((card) => card.isInverted === true).length;

			const inverted = randomizer.randomizeInverted(alreadyHasNormal);

			randomCardId = randomCard.cardId;
			variant = randomCard.variant;
			variantDataIndex = randomCard.variantIndex;

			if (inverted) {
				isInverted = true;
				alreadyInCollection = alreadyHasInverted;
			} else {
				isInverted = false;
				alreadyInCollection = alreadyHasNormal;
			}
		}
	}

	// Construct a roll embed
	const cardDetails = archive.getCardDetailsById(randomCardId)!;
	const cardFullName = archive.getCardFullName(randomCardId, isInverted, variantDataIndex);
	const cardShortName = archive.getCardShortName(randomCardId, isInverted, variantDataIndex, true);
	const starString = createStarString(cardDetails.rarity, isInverted);
	const art = randomArt(randomCardId, isInverted, variantDataIndex);

	const descriptionLines: string[] = [];

	if (secondsUntilNextRollPeriod <= 300) {
		// Less than 5 min until the next roll period
		const min = Math.floor(secondsUntilNextRollPeriod / 60);
		const sec = secondsUntilNextRollPeriod - min * 60;
		descriptionLines.push(
			`> The next roll period starts in${min > 0 ? ` ${min}m` : ''}${sec > 0 ? ` ${sec}s` : ''}.`,
		);
	}

	if (alreadyInCollection > 0) {
		if (alreadyInCollection === 1) {
			descriptionLines.push(`> You already have ${cardShortName} in your collection.`);
		} else {
			descriptionLines.push(`> You already have ${alreadyInCollection} ${cardShortName}s in your collection.`);
		}
	}

	if (isInverted) {
		descriptionLines.push(`> **A rare inverted (flipped) card!**`);
	}

	if (variantDataIndex !== undefined) {
		descriptionLines.push(
			`> **A rare ${variant} variant of ${archive.getCardShortName(randomCardId, false, undefined, true)}!**`,
		);

		if (cardDetails.variants![variantDataIndex].description) {
			descriptionLines.push('\n');
			descriptionLines.push(cardDetails.variants![variantDataIndex].description);
		}
	}

	const embedColor = archive.getCardColor(isInverted, variantDataIndex !== undefined);
	const timestamp = new Date().toISOString();

	// Set up the message components
	const components: DAPI.APIMessageActionRowComponent[] = [];

	components.push({
		type: DAPI.ComponentType.Button,
		label: '❤️ Claim',
		style: DAPI.ButtonStyle.Primary,
		custom_id: `catcha/claim/${user.id},${randomCardId},${isInverted ? '1' : '0'},${variantDataIndex ?? ''}`, // userId,cardId,inverted,variant
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
		rollCache: setRollCache,
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
