import * as DAPI from 'discord-api-types/v10';

import * as defer from '#discord/responses-deferred.js';
import { messageResponse } from '#discord/responses.js';
import { stringifyCards } from '../collection/list-utils.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import { processTrade } from './trade.js';

import type { CatchaTrade } from '@prisma/client';

type Trade = Awaited<ReturnType<typeof catchaDB.updateTrade>>;

function createTradeConfirmation(
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

	return messageResponse({
		embeds: [
			{
				title: 'Trade confirmation',
				fields: [
					{
						name: `${senderUsername}`,
						value: `\`\`\`less\n${stringifyCards(senderCards).join('\n')}\`\`\``,
						inline: true,
					},
					{
						name: `${recipientUsername}`,
						value: `\`\`\`less\n${stringifyCards(recipientCards).join('\n')}\`\`\``,
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
						custom_id: `catcha/trade/y/${trade.tradeUuid},${senderDiscordId},${recipientDiscordId}`,
					},
					{
						type: DAPI.ComponentType.Button,
						label: '❌ Decline',
						style: DAPI.ButtonStyle.Danger,
						custom_id: `catcha/trade/n/${trade.tradeUuid},${senderDiscordId},${recipientDiscordId}`,
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
		await catchaDB.deleteTrade(env.PRISMA, tradeUuid); // Cancel the trade

		return messageResponse({
			content: 'No trade confirmation embed found. Trade canceled.',
			embeds: [],
			components: [],
			update: true,
		});
	}

	// Get a trade with the UUID
	let trade = await catchaDB.getTrade(env.PRISMA, tradeUuid, false);

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
			trade = await catchaDB.updateTrade(env.PRISMA, trade.tradeUuid, {
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
			trade = await catchaDB.updateTrade(env.PRISMA, trade.tradeUuid, {
				recipientAccepted: true,
			});

			newFooterText = '-/✅';
		}
	}

	return createTradeConfirmation(
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
		await catchaDB.deleteTrade(env.PRISMA, tradeUuid); // Cancel the trade

		return messageResponse({
			content: 'No trade confirmation embed found. Trade canceled.',
			embeds: [],
			components: [],
			update: true,
		});
	}

	// Get a trade with the UUID
	const trade = await catchaDB.getTrade(env.PRISMA, tradeUuid, false);

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
	await catchaDB.deleteTrade(env.PRISMA, tradeUuid);

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

export { createTradeConfirmation, accept, decline };
