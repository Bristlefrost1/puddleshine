import * as DAPI from 'discord-api-types/v10';

import { parseCommandOptions } from '#discord/parse-options.js';
import {
	embedMessageResponse,
	confirmationResponse,
	cancelConfirmationResponse,
	errorEmbed,
	simpleEphemeralResponse,
} from '#discord/responses.js';
import * as dateTimeUtils from '#utils/date-time-utils.js';

import * as db from '#db/database.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import * as archive from '#commands/catcha/archive/archive.js';

function getLastBirthdayYear(profileBirthday: string) {
	const splitBirthday = profileBirthday.split('-');
	const birthdayDay = Number.parseInt(splitBirthday[1]);
	const birthdayMonth = Number.parseInt(splitBirthday[0]);
	const lastBirthdayYear = dateTimeUtils.getLastDateYear(birthdayDay, birthdayMonth);

	return lastBirthdayYear;
}

async function handleBirthdayMessageComponent(
	interaction: DAPI.APIMessageComponentInteraction,
	parsedCustomId: string[],
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const embed = interaction.message.embeds[0];
	const yesOrNo = parsedCustomId[2] as 'y' | 'n';

	const data = parsedCustomId[3].split(',');
	const userId = data[0];
	const claimBirthdayYear = Number.parseInt(data[1]);
	const claimCardId = Number.parseInt(data[2]);

	const cardName = archive.getCardFullName(claimCardId);

	if (embed) {
		embed.title = undefined;
		embed.description = `\`\`\`less\n[#${claimCardId}] ${cardName}\`\`\``;
	}

	if (user.id !== userId) return simpleEphemeralResponse('This is not your confirmation.');

	if (yesOrNo === 'n') return cancelConfirmationResponse(undefined, { oldEmbed: embed });

	const userProfile = await db.findProfileWithDiscordId(env.PRISMA, user.id);
	if (!userProfile || !userProfile.birthday) return cancelConfirmationResponse('No birthday set.');

	const userCatcha = await catchaDB.findCatcha(env.PRISMA, user.id);
	if (!userCatcha) return cancelConfirmationResponse('No Catcha found.');

	if (userCatcha.lastBirthdayCardClaimed && userCatcha.lastBirthdayCardClaimed >= claimBirthdayYear) {
		return cancelConfirmationResponse(`You've already claimed a card for your ${claimBirthdayYear} birthday.`);
	}

	await catchaDB.claimBirthdayCard(env.PRISMA, userCatcha.userUuid, claimBirthdayYear, claimCardId);

	return {
		type: DAPI.InteractionResponseType.UpdateMessage,
		data: {
			content: `Birthday card claimed.`,
			embeds: embed ? [embed] : undefined,
			components: [],
		},
	};
}

async function handleBirthdaySubcommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[],
	user: DAPI.APIUser,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const { card } = parseCommandOptions(commandOptions);

	if (!card || card.type !== DAPI.ApplicationCommandOptionType.String)
		return simpleEphemeralResponse('No card option provided.');

	const cardOptionValue = card.value.trim();

	let claimCardId = Number.parseInt(cardOptionValue);

	if (isNaN(claimCardId)) {
		const cardIdsFromArchive = archive.searchForCardIds(cardOptionValue);

		if (cardIdsFromArchive.length === 0) {
			return simpleEphemeralResponse(`No cards found with the name ${cardOptionValue}.`);
		} else if (cardIdsFromArchive.length > 1) {
			return simpleEphemeralResponse(`The search term ${cardOptionValue} returned more than one card.`);
		} else {
			claimCardId = cardIdsFromArchive[0];
		}
	}

	const userProfile = await db.findProfileWithDiscordId(env.PRISMA, user.id);

	if (!userProfile || !userProfile.birthday) {
		return embedMessageResponse(
			errorEmbed(
				"You don't have a birthday set in your profile. You need to set one using `/profile set birthday`.",
			),
		);
	}

	const lastBirthdayYear = getLastBirthdayYear(userProfile.birthday);
	let claimBirthdayYear = lastBirthdayYear;

	let userCatcha = await catchaDB.findCatcha(env.PRISMA, user.id);

	if (!userCatcha) {
		await catchaDB.initializeCatchaForUser(env.PRISMA, user.id);
		userCatcha = await catchaDB.findCatcha(env.PRISMA, user.id);
	}

	if (!userCatcha) return simpleEphemeralResponse('No Catcha found.');

	if (userCatcha.lastBirthdayCardClaimed) {
		if (userCatcha.lastBirthdayCardClaimed >= lastBirthdayYear) {
			return embedMessageResponse(
				errorEmbed(`You've already claimed a card for your ${lastBirthdayYear} birthday.`),
			);
		} else {
			claimBirthdayYear = userCatcha.lastBirthdayCardClaimed + 1;
		}
	}

	const cardName = archive.getCardFullName(claimCardId);

	return confirmationResponse({
		action: 'catcha/birthday',
		actionData: `${user.id},${claimBirthdayYear},${claimCardId}`,
		question: `Are you sure you want to claim the following card for your ${claimBirthdayYear} birthday?\n\`\`\`less\n[#${claimCardId}] ${cardName}\`\`\``,
	});
}

export { handleBirthdaySubcommand, handleBirthdayMessageComponent };
