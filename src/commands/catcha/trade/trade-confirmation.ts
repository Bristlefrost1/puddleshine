import * as DAPI from 'discord-api-types/v10';

import { stringifyCards } from '../collection/list-utils.js';
import * as defer from '#discord/responses-deferred.js';
import * as catchaDB from '#commands/catcha/db/catcha-db.js';
import { processTrade } from './trade.js';

import type { CatchaTrade } from '@prisma/client';

type Trade = Awaited<ReturnType<typeof catchaDB.updateTrade>>;

async function createTradeConfirmation(
	interaction: DAPI.APIApplicationCommandInteraction,
	sender: DAPI.APIUser,
	recipient: DAPI.APIUser,
	trade: Trade,
	env: Env,
) {
	const applicationId = env.DISCORD_APPLICATION_ID;
	const discordToken = env.DISCORD_TOKEN;

	const senderUsername = `${sender.username}${sender.discriminator === '0' ? '' : `#${sender.discriminator}`}`;
	const recipientUsername = `${recipient.username}${recipient.discriminator === '0' ? '' : `#${recipient.discriminator}`}`;

	const senderCards = trade.senderCards;
	const recipientCards = trade.recipientCards;

	await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
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
				footer: { text: '-/-' },
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
						custom_id: `catcha/trade/y/${trade.tradeUuid},${sender.id},${recipient.id}`,
					},
					{
						type: DAPI.ComponentType.Button,
						label: '❌ Decline',
						style: DAPI.ButtonStyle.Danger,
						custom_id: `catcha/trade/n/${trade.tradeUuid},${sender.id},${recipient.id}`,
					},
				],
			},
		],
	});
}

async function accept(
	interaction: DAPI.APIMessageComponentInteraction,
	interactionData: string[],
	user: DAPI.APIUser,
	env: Env,
) {
	const applicationId = env.DISCORD_APPLICATION_ID;
	const discordToken = env.DISCORD_TOKEN;

	// The existing embed of the trade confirmation message
	const oldEmbed = interaction.message.embeds[0];
	const newEmbed: DAPI.APIEmbed = {
		title: undefined,
		fields: oldEmbed.fields,
		timestamp: oldEmbed.timestamp,
		footer: oldEmbed.footer,
	};

	// Get the trade details from the interation data (the part of the custom ID separated by commas)
	const tradeUuid = interactionData[0];
	const senderDiscordId = interactionData[1];
	const recipientDiscordId = interactionData[2];

	// Get a trade with the UUID
	let trade = await catchaDB.getTrade(env.PRISMA, tradeUuid, false);

	// Not found, perhaps either user canceled by doing /catcha trade cancel
	if (trade === null) {
		newEmbed.footer = undefined;
		newEmbed.timestamp = undefined;

		await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
			content: 'This trade was canceled.',
			embeds: [newEmbed],
			components: [],
		});

		return;
	}

	let newFooterText = '-/-';

	if (user.id === senderDiscordId) {
		// Side 1 accepted
		if (trade.recipientAccepted) {
			// The other side has accepted too, process the trade
			await processTrade(interaction, trade, env);

			return;
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
			await processTrade(interaction, trade, env);

			return;
		} else {
			// Update the trade and footer to show that side 2 has accepted
			trade = await catchaDB.updateTrade(env.PRISMA, trade.tradeUuid, {
				recipientAccepted: true,
			});
			newFooterText = '-/✅';
		}
	}

	if (newEmbed.footer) newEmbed.footer.text = newFooterText;
	newEmbed.title = oldEmbed.title; // Preserve the old title

	// Edit the trade confirmation message with the new footer
	await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
		embeds: [newEmbed],
	});
}

async function decline(
	interaction: DAPI.APIMessageComponentInteraction,
	interactionData: string[],
	user: DAPI.APIUser,
	env: Env,
) {
	const applicationId = env.DISCORD_APPLICATION_ID;
	const discordToken = env.DISCORD_TOKEN;

	// The existing embed of the trade confirmation message
	const oldEmbed = interaction.message.embeds[0];
	const newEmbed: DAPI.APIEmbed = {
		title: undefined,
		fields: oldEmbed.fields,
		timestamp: oldEmbed.timestamp,
		footer: oldEmbed.footer,
	};

	// Get the trade details from the interation data (the part of the custom ID separated by commas)
	const tradeUuid = interactionData[0];
	const senderDiscordId = interactionData[1];
	const recipientDiscordId = interactionData[2];

	// Get a trade with the UUID
	const trade = await catchaDB.getTrade(env.PRISMA, tradeUuid, false);

	// Not found, perhaps either user canceled by doing /catcha trade cancel
	if (trade === null) {
		newEmbed.footer = undefined;
		newEmbed.timestamp = undefined;

		await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
			content: 'This trade was canceled.',
			embeds: [newEmbed],
			components: [],
		});

		return;
	}

	// Drop the trade from the DB
	await catchaDB.deleteTrade(env.PRISMA, tradeUuid);

	// Update the footer text
	let newFooterText = '';

	if (user.id === senderDiscordId) {
		newFooterText = `❌/${oldEmbed.footer?.text.split('/')[1]}`;
	} else {
		newFooterText = `${oldEmbed.footer?.text.split('/')[0]}/❌`;
	}

	if (newEmbed.footer) newEmbed.footer.text = newFooterText;

	// Update the trade confirmation
	await defer.editInteractionResponse(applicationId, discordToken, interaction.token, {
		content: 'Trade declined.',
		embeds: [newEmbed],
		components: [],
	});
}

export { createTradeConfirmation, accept, decline };
