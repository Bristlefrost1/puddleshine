import * as DAPI from 'discord-api-types/v10';

import { simpleEphemeralResponse } from '#discord/responses.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import * as archive from '#commands/catcha/archive/archive.js';
import * as rollPeriod from './roll-period.js';

import * as config from '#config.js';

async function onClaim(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[],
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const rollMessage = interaction.message;
	const rolledTimestamp = Math.floor(Date.parse(rollMessage.timestamp) / 1000);
	const rolledInPeriod = rollPeriod.getRollPeriodFromUnixTime(rolledTimestamp);
	const currentRollPeriod = rollPeriod.getCurrentRollPeriod();

	const claimData = parsedCustomId[2].split(','); // userId,cardId,inverted,variant
	const rolledByDiscordId = claimData[0];
	const claimedCardId = Number.parseInt(claimData[1]);
	const isClaimInverted = claimData[2] === '1' ? true : false;
	const claimedVariantIndex = claimData[3] !== '' ? Number.parseInt(claimData[3]) : undefined;
	let claimedVariant: string | null = null;

	if (claimedVariantIndex !== undefined) {
		const cardDetails = archive.getCardDetailsById(claimedCardId);

		if (cardDetails?.variants && cardDetails.variants.length > 0) {
			const variant = cardDetails.variants[claimedVariantIndex];

			if (variant) claimedVariant = variant.variant;
		}
	}

	// Prevent claiming someone else's rolls or claiming cards from past roll periods
	if (user.id !== rolledByDiscordId)
		return simpleEphemeralResponse('You cannot claim a card rolled by someone else.');
	if (rolledInPeriod !== currentRollPeriod)
		return simpleEphemeralResponse('You cannot claim a card rolled in a different roll period.');

	const userCatcha = await catchaDB.findCatcha(env.PRISMA, user.id);

	// This should never happen.
	// There's already a check to prevent you from claiming someone else's rolls
	// and when you roll a user is created.
	if (!userCatcha) throw 'No user found in the DB';

	if (userCatcha.lastClaim && env.ENV !== 'dev') {
		const lastClaimTimestamp = Math.floor(userCatcha.lastClaim.getTime() / 1000);
		const lastClaimRollPeriod = rollPeriod.getRollPeriodFromUnixTime(lastClaimTimestamp);

		if (lastClaimRollPeriod === currentRollPeriod) {
			return simpleEphemeralResponse("You've already claimed a card in this roll period.");
		} else if (lastClaimRollPeriod >= currentRollPeriod - config.CATCHA_CLAIM_COOLDOWN_PERIODS) {
			const cooldownEndPeriod = lastClaimRollPeriod + config.CATCHA_CLAIM_COOLDOWN_PERIODS + 1;
			const cooldownEndTimestamp = cooldownEndPeriod * 60 * 60 + rollPeriod.ROLL_PERIOD_EPOCH;

			return simpleEphemeralResponse(
				`You've recently claimed a card ${user.username} and are now on cooldown. You'll be able to roll and claim again at <t:${cooldownEndTimestamp}:t>.`,
			);
		}
	}

	const claimTime = new Date();

	await catchaDB.claimCard(env.PRISMA, {
		userUuid: userCatcha.userUuid,
		cardId: claimedCardId,
		claimTime,
		isInverted: isClaimInverted,
		variant: claimedVariant,
	});

	return {
		type: DAPI.InteractionResponseType.ChannelMessageWithSource,
		data: {
			content: `You've claimed ${archive.getCardShortName(claimedCardId, isClaimInverted, claimedVariant ?? undefined, false)}, <@${user.id}>!`,
		},
	};
}

export { onClaim };
