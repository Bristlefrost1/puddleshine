import * as DAPI from 'discord-api-types/v10';

import { messageResponse } from '#discord/responses.js';

import * as tradeDB from '#commands/trade/db/trade-db.js';
import { stringifyCards } from '#commands/catcha/collection/list-utils.js';
import { getKit } from '#commands/nursery/game/kit.js';
import { stringifyKitDescription, stringifyKitStats } from '#commands/nursery/nursery-views.js';
import { processTrade } from '#commands/trade/trade.js';

type Trade = Awaited<ReturnType<typeof tradeDB.updateTrade>>;

function createTradeConfirmationResponse(
	trade: Trade,
	senderDiscordId: string,
	senderUsername: string,
	recipientDiscordId: string,
	recipientUsername: string,
	footerText?: string,
	update?: boolean,
): DAPI.APIInteractionResponse {
	const senderCards = trade.senderCards;
	const recipientCards = trade.recipientCards;
	const senderKits = trade.senderKits;
	const recipientKits = trade.recipientKits;

	const senderDescriptionLines: string[] = [];
	const recipientDescriptionLines: string[] = [];

	// Sender side
	if (senderCards.length > 0) {
		senderDescriptionLines.push('Cards:');
		senderDescriptionLines.push('```less');
		senderDescriptionLines.push(...stringifyCards(senderCards));
		senderDescriptionLines.push('```');
	}

	if (senderKits.length > 0) {
		senderDescriptionLines.push('Kits:');
		senderDescriptionLines.push('```ansi');

		for (const kit of senderKits) {
			senderDescriptionLines.push(stringifyKitDescription(getKit(kit, 0), true));
			senderDescriptionLines.push(stringifyKitStats(getKit(kit, 0), true));
		}

		senderDescriptionLines.push('```');
	}

	if (senderCards.length === 0 && senderKits.length === 0) {
		senderDescriptionLines.push('```less');
		senderDescriptionLines.push('Nothing');
		senderDescriptionLines.push('```');
	}

	// Recipient side
	if (recipientCards.length > 0) {
		recipientDescriptionLines.push('Cards:');
		recipientDescriptionLines.push('```less');
		recipientDescriptionLines.push(...stringifyCards(recipientCards));
		recipientDescriptionLines.push('```');
	}

	if (recipientKits.length > 0) {
		recipientDescriptionLines.push('Kits:');
		recipientDescriptionLines.push('```ansi');

		for (const kit of recipientKits) {
			recipientDescriptionLines.push(stringifyKitDescription(getKit(kit, 0), true));
			recipientDescriptionLines.push(stringifyKitStats(getKit(kit, 0), true));
		}

		recipientDescriptionLines.push('```');
	}

	if (recipientCards.length === 0 && recipientKits.length === 0) {
		recipientDescriptionLines.push('```less');
		recipientDescriptionLines.push('Nothing');
		recipientDescriptionLines.push('```');
	}

	return messageResponse({
		embeds: [
			{
				title: 'Trade confirmation',
				fields: [
					{
						name: `${senderUsername}`,
						value: senderDescriptionLines.join('\n'),
						inline: true,
					},
					{
						name: `${recipientUsername}`,
						value: recipientDescriptionLines.join('\n'),
						inline: true,
					},
				],
				timestamp: trade.updatedAt.toISOString(),
				footer: { text: footerText ?? '-/-' },
			},
		],
		components: [
			{
				type: DAPI.ComponentType.ActionRow,
				components: [
					{
						type: DAPI.ComponentType.Button,
						label: '✅ Accept',
						style: DAPI.ButtonStyle.Success,
						custom_id: `trade/y/${trade.tradeUuid},${senderDiscordId},${recipientDiscordId}`,
					},
					{
						type: DAPI.ComponentType.Button,
						label: '❌ Decline',
						style: DAPI.ButtonStyle.Danger,
						custom_id: `trade/n/${trade.tradeUuid},${senderDiscordId},${recipientDiscordId}`,
					},
				],
			},
		],
		update,
	});
}

async function accept(
	interaction: DAPI.APIMessageComponentInteraction,
	interactionData: string[],
	user: DAPI.APIUser,
	env: Env,
): Promise<DAPI.APIInteractionResponse> {
	// Get the trade details from the interation data (the part of the custom ID separated by commas)
	const tradeUuid = interactionData[0];
	const senderDiscordId = interactionData[1];
	const recipientDiscordId = interactionData[2];

	// The existing embed of the trade confirmation message
	const confirmationEmbed = interaction.message.embeds[0];

	if (!confirmationEmbed || !confirmationEmbed.fields) {
		await tradeDB.deleteTrade(env.PRISMA, tradeUuid); // Cancel the trade

		return messageResponse({
			content: 'No trade confirmation embed found. Trade canceled.',
			embeds: [],
			components: [],
			update: true,
		});
	}

	// Get a trade with the UUID
	let trade = await tradeDB.findTrade(env.PRISMA, tradeUuid, false);

	// Not found, perhaps either user canceled by doing /catcha trade cancel
	if (trade === null) {
		const newEmbed: DAPI.APIEmbed = {
			title: undefined,
			fields: confirmationEmbed.fields,
			timestamp: confirmationEmbed.timestamp,
			footer: confirmationEmbed.footer,
		};

		newEmbed.footer = undefined;
		newEmbed.timestamp = undefined;

		return messageResponse({
			content: 'This trade was canceled.',
			embeds: [newEmbed],
			components: [],
			update: true,
		});
	}

	let newFooterText = '-/-';

	if (user.id === senderDiscordId) {
		// Side 1 accepted
		if (trade.recipientAccepted) {
			// The other side has accepted too, process the trade
			return await processTrade(interaction, trade, senderDiscordId, recipientDiscordId, env);
		} else {
			// Update the trade and footer to show that side 1 has accepted
			trade = await tradeDB.updateTrade(env.PRISMA, trade.tradeUuid, {
				senderAccepted: true,
			});

			newFooterText = '✅/-';
		}
	} else if (user.id === recipientDiscordId) {
		// Side 2 accepted
		if (trade.senderAccepted) {
			// The other side has accepted too, process the trade
			return await processTrade(interaction, trade, senderDiscordId, recipientDiscordId, env);
		} else {
			// Update the trade and footer to show that side 2 has accepted
			trade = await tradeDB.updateTrade(env.PRISMA, trade.tradeUuid, {
				recipientAccepted: true,
			});

			newFooterText = '-/✅';
		}
	}

	return createTradeConfirmationResponse(
		trade,
		senderDiscordId,
		confirmationEmbed.fields[0].name,
		recipientDiscordId,
		confirmationEmbed.fields[1].name,
		newFooterText,
		true,
	);
}

async function decline(
	interaction: DAPI.APIMessageComponentInteraction,
	interactionData: string[],
	user: DAPI.APIUser,
	env: Env,
): Promise<DAPI.APIInteractionResponse> {
	// Get the trade details from the interation data (the part of the custom ID separated by commas)
	const tradeUuid = interactionData[0];
	const senderDiscordId = interactionData[1];
	const recipientDiscordId = interactionData[2];

	// The existing embed of the trade confirmation message
	const confirmationEmbed = interaction.message.embeds[0];
	const newEmbed: DAPI.APIEmbed = {
		title: undefined,
		fields: confirmationEmbed.fields,
		timestamp: confirmationEmbed.timestamp,
		footer: confirmationEmbed.footer,
	};

	if (!confirmationEmbed || !confirmationEmbed.fields) {
		await tradeDB.deleteTrade(env.PRISMA, tradeUuid); // Cancel the trade

		return messageResponse({
			content: 'No trade confirmation embed found. Trade canceled.',
			embeds: [],
			components: [],
			update: true,
		});
	}

	// Get a trade with the UUID
	const trade = await tradeDB.findTrade(env.PRISMA, tradeUuid, false);

	// Not found, perhaps either user canceled by doing /catcha trade cancel
	if (trade === null) {
		newEmbed.footer = undefined;
		newEmbed.timestamp = undefined;

		return messageResponse({
			content: 'This trade was canceled.',
			embeds: [newEmbed],
			components: [],
			update: true,
		});
	}

	// Drop the trade from the DB
	await tradeDB.deleteTrade(env.PRISMA, tradeUuid);

	// Update the footer text
	let newFooterText = '';

	if (user.id === senderDiscordId) {
		newFooterText = `❌/${confirmationEmbed.footer?.text.split('/')[1]}`;
	} else {
		newFooterText = `${confirmationEmbed.footer?.text.split('/')[0]}/❌`;
	}

	if (newEmbed.footer) newEmbed.footer.text = newFooterText;

	// Update the trade confirmation
	return messageResponse({
		content: 'Trade declined.',
		embeds: [newEmbed],
		components: [],
		update: true,
	});
}

export { createTradeConfirmationResponse, accept, decline };
