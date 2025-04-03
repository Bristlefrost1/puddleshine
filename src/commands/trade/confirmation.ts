import * as DAPI from 'discord-api-types/v10'

import { messageResponse } from '@/discord/responses'
import { deferMessageUpdate, editInteractionResponse } from '@/discord/responses-deferred'
import { bot } from '@/bot'

import * as tradeDB from '@/commands/trade/db/trade-db'
import { stringifyCards } from '@/commands/catcha/collection'
import { getKit } from '@/commands/nursery/game/kit'
import { stringifyKitDescription, stringifyKitStatus } from '@/commands/nursery/nursery-views'
import { processTrade } from '@/commands/trade/trade'

type Trade = Awaited<ReturnType<typeof tradeDB.updateTrade>>

export function createTradeConfirmationResponse(
	trade: Trade,
	senderDiscordId: string,
	senderUsername: string,
	recipientDiscordId: string,
	recipientUsername: string,
	footerText?: string,
	update?: boolean,
): DAPI.APIInteractionResponseChannelMessageWithSource | DAPI.APIInteractionResponseUpdateMessage {
	const senderCards = trade.senderCards
	const recipientCards = trade.recipientCards
	const senderKits = trade.senderKits
	const recipientKits = trade.recipientKits

	const senderDescriptionLines: string[] = []
	const recipientDescriptionLines: string[] = []

	// Sender side
	if (senderCards.length > 0) {
		senderDescriptionLines.push('Cards:')
		senderDescriptionLines.push('```less')
		senderDescriptionLines.push(...stringifyCards(senderCards))
		senderDescriptionLines.push('```')
	}

	if (senderKits.length > 0) {
		senderDescriptionLines.push('Kits:')
		senderDescriptionLines.push('```ansi')

		for (const kit of senderKits) {
			senderDescriptionLines.push(stringifyKitDescription(getKit(kit, 0), true))
			senderDescriptionLines.push(stringifyKitStatus(getKit(kit, 0), true))
		}

		senderDescriptionLines.push('```')
	}

	if (senderCards.length === 0 && senderKits.length === 0) {
		senderDescriptionLines.push('```less')
		senderDescriptionLines.push('Nothing')
		senderDescriptionLines.push('```')
	}

	// Recipient side
	if (recipientCards.length > 0) {
		recipientDescriptionLines.push('Cards:')
		recipientDescriptionLines.push('```less')
		recipientDescriptionLines.push(...stringifyCards(recipientCards))
		recipientDescriptionLines.push('```')
	}

	if (recipientKits.length > 0) {
		recipientDescriptionLines.push('Kits:')
		recipientDescriptionLines.push('```ansi')

		for (const kit of recipientKits) {
			recipientDescriptionLines.push(stringifyKitDescription(getKit(kit, 0), true))
			recipientDescriptionLines.push(stringifyKitStatus(getKit(kit, 0), true))
		}

		recipientDescriptionLines.push('```')
	}

	if (recipientCards.length === 0 && recipientKits.length === 0) {
		recipientDescriptionLines.push('```less')
		recipientDescriptionLines.push('Nothing')
		recipientDescriptionLines.push('```')
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
	})
}

export async function accept(
	interaction: DAPI.APIMessageComponentInteraction,
	interactionData: string[],
	user: DAPI.APIUser,
): Promise<DAPI.APIInteractionResponse> {
	const deferredExecute = async () => {
		const interactionToken = interaction.token

		// Get the trade details from the interation data (the part of the custom ID separated by commas)
		const tradeUuid = interactionData[0]
		const senderDiscordId = interactionData[1]
		const recipientDiscordId = interactionData[2]

		// The existing embed of the trade confirmation message
		const confirmationEmbed = interaction.message.embeds[0]

		if (!confirmationEmbed || !confirmationEmbed.fields) {
			await tradeDB.deleteTrade(bot.prisma, tradeUuid) // Cancel the trade

			await editInteractionResponse(
				interactionToken,
				messageResponse({
					content: 'No trade confirmation embed found. Trade cancelled.',
					embeds: [],
					components: [],
					update: true,
				}).data!,
			)
			
			return
		}

		// Get a trade with the UUID
		let trade = await tradeDB.findTrade(bot.prisma, tradeUuid, false)

		// Not found, perhaps either user cancelled by doing /catcha trade cancel
		if (trade === null) {
			const newEmbed: DAPI.APIEmbed = {
				title: undefined,
				fields: confirmationEmbed.fields,
				timestamp: confirmationEmbed.timestamp,
				footer: confirmationEmbed.footer,
			}

			newEmbed.footer = undefined
			newEmbed.timestamp = undefined

			await editInteractionResponse(
				interactionToken,
				messageResponse({
					content: 'This trade was cancelled.',
					embeds: [newEmbed],
					components: [],
					update: true,
				}).data!,
			)
			
			return
		}

		let newFooterText = '-/-'

		if (user.id === senderDiscordId) {
			// Side 1 accepted
			if (trade.recipientAccepted) {
				// The other side has accepted too, process the trade
				const tradeResponse = await processTrade(interaction, trade, senderDiscordId, recipientDiscordId)
				await editInteractionResponse(interactionToken, tradeResponse.data!)
				
				return
			} else {
				// Update the trade and footer to show that side 1 has accepted
				trade = await tradeDB.updateTrade(bot.prisma, trade.tradeUuid, {
					senderAccepted: true,
				})

				newFooterText = '✅/-'
			}
		} else if (user.id === recipientDiscordId) {
			// Side 2 accepted
			if (trade.senderAccepted) {
				// The other side has accepted too, process the trade
				const tradeResponse = await processTrade(interaction, trade, senderDiscordId, recipientDiscordId)
				await editInteractionResponse(interactionToken, tradeResponse.data!)
				
				return
			} else {
				// Update the trade and footer to show that side 2 has accepted
				trade = await tradeDB.updateTrade(bot.prisma, trade.tradeUuid, {
					recipientAccepted: true,
				})

				newFooterText = '-/✅'
			}
		}

		await editInteractionResponse(
			interactionToken,
			createTradeConfirmationResponse(
				trade,
				senderDiscordId,
				confirmationEmbed.fields[0].name,
				recipientDiscordId,
				confirmationEmbed.fields[1].name,
				newFooterText,
				true,
			).data!,
		)
		
		return
	}

	bot.ctx.waitUntil(deferredExecute())
	
	return deferMessageUpdate()
}

export async function decline(
	interaction: DAPI.APIMessageComponentInteraction,
	interactionData: string[],
	user: DAPI.APIUser,
): Promise<DAPI.APIInteractionResponse> {
	const deferredExecute = async () => {
		const interactionToken = interaction.token

		// Get the trade details from the interation data (the part of the custom ID separated by commas)
		const tradeUuid = interactionData[0]
		const senderDiscordId = interactionData[1]
		const recipientDiscordId = interactionData[2]

		// The existing embed of the trade confirmation message
		const confirmationEmbed = interaction.message.embeds[0]
		const newEmbed: DAPI.APIEmbed = {
			title: undefined,
			fields: confirmationEmbed.fields,
			timestamp: confirmationEmbed.timestamp,
			footer: confirmationEmbed.footer,
		}

		if (!confirmationEmbed || !confirmationEmbed.fields) {
			await tradeDB.deleteTrade(bot.prisma, tradeUuid) // Cancel the trade

			await editInteractionResponse(
				interactionToken,
				messageResponse({
					content: 'No trade confirmation embed found. Trade cancelled.',
					embeds: [],
					components: [],
					update: true,
				}).data!,
			)
			
			return
		}

		// Get a trade with the UUID
		const trade = await tradeDB.findTrade(bot.prisma, tradeUuid, false)

		// Not found, perhaps either user cancelled by doing /catcha trade cancel
		if (trade === null) {
			newEmbed.footer = undefined
			newEmbed.timestamp = undefined

			await editInteractionResponse(
				interactionToken,
				messageResponse({
					content: 'This trade was cancelled.',
					embeds: [newEmbed],
					components: [],
					update: true,
				}).data!,
			)
			
			return
		}

		// Drop the trade from the DB
		await tradeDB.deleteTrade(bot.prisma, tradeUuid)

		// Update the footer text
		let newFooterText = ''

		if (user.id === senderDiscordId) {
			newFooterText = `❌/${confirmationEmbed.footer?.text.split('/')[1]}`
		} else {
			newFooterText = `${confirmationEmbed.footer?.text.split('/')[0]}/❌`
		}

		if (newEmbed.footer) newEmbed.footer.text = newFooterText

		// Update the trade confirmation
		await editInteractionResponse(
			interactionToken,
			messageResponse({
				content: 'Trade declined.',
				embeds: [newEmbed],
				components: [],
				update: true,
			}).data!,
		)
		
		return
	}
	
	bot.ctx.waitUntil(deferredExecute())
	
	return deferMessageUpdate()
}
