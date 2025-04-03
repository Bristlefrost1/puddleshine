import * as DAPI from 'discord-api-types/v10'

import { bot } from '@/bot'
import { parseCommandOptions } from '@/discord/parse-options'
import {
	embedMessageResponse,
	confirmationResponse,
	cancelConfirmationResponse,
	errorEmbed,
	simpleEphemeralResponse,
} from '@/discord/responses'
import * as dateTimeUtils from '@/utils/date-time-utils'
import * as db from '@/db/database'
import * as catchaDB from '@/db/catcha-db'
import * as archive from '@/commands/catcha/archive'

import { type Subcommand } from '@/commands'

function getLastBirthdayYear(profileBirthday: string) {
	const splitBirthday = profileBirthday.split('-')
	const birthdayDay = Number.parseInt(splitBirthday[1])
	const birthdayMonth = Number.parseInt(splitBirthday[0])
	const lastBirthdayYear = dateTimeUtils.getLastDateYear(birthdayDay, birthdayMonth)

	return lastBirthdayYear
}

export default {
	name: 'birthday',

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: 'birthday',
		description: 'Claim a free card as your birthday present.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'card',
				description: 'The card to claim',
				required: true,
				autocomplete: true,
			},
		],
	},

	async onApplicationCommand({ interaction, user, options }) {
		const { card } = parseCommandOptions(options)

		if (!card || card.type !== DAPI.ApplicationCommandOptionType.String)
		return simpleEphemeralResponse('No card option provided.')

		const cardOptionValue = card.value.trim()

		let claimCardId = Number.parseInt(cardOptionValue)

		if (isNaN(claimCardId)) {
			const cardIdsFromArchive = await archive.searchForCards(cardOptionValue)

			if (cardIdsFromArchive.length === 0) {
				return simpleEphemeralResponse(`No cards found with the name ${cardOptionValue}.`)
			} else if (cardIdsFromArchive.length > 1) {
				return simpleEphemeralResponse(`The search term ${cardOptionValue} returned more than one card.`)
			} else {
				claimCardId = cardIdsFromArchive[0].id
			}
		}

		const userProfile = await db.findProfileWithDiscordId(bot.prisma, user.id)

		if (!userProfile || !userProfile.birthday) {
			return embedMessageResponse(
				errorEmbed(
					"You don't have a birthday set in your profile. You need to set one using `/profile set birthday`.",
				),
			)
		}

		const lastBirthdayYear = getLastBirthdayYear(userProfile.birthday)
		let claimBirthdayYear = lastBirthdayYear

		let userCatcha = await catchaDB.findCatcha(bot.prisma, user.id)

		if (!userCatcha) {
			await catchaDB.initialiseCatchaForUser(bot.prisma, user.id)
			userCatcha = await catchaDB.findCatcha(bot.prisma, user.id)
		}

		if (!userCatcha) return simpleEphemeralResponse('No Catcha found.')

		if (userCatcha.lastBirthdayCardClaimed) {
			if (userCatcha.lastBirthdayCardClaimed >= lastBirthdayYear) {
				return embedMessageResponse(
					errorEmbed(`You've already claimed a card for your ${lastBirthdayYear} birthday.`),
				)
			} else {
				claimBirthdayYear = userCatcha.lastBirthdayCardClaimed + 1
			}
		}

		const cardName = archive.getCardFullName({ card: await archive.getCardDetailsById(claimCardId) as any })

		return confirmationResponse({
			action: 'catcha/birthday',
			actionData: `${user.id},${claimBirthdayYear},${claimCardId}`,
			question: `Are you sure you want to claim the following card for your ${claimBirthdayYear} birthday?\n\`\`\`less\n[#${claimCardId}] ${cardName}\`\`\``,
		})
	},

	async onMessageComponent({ interaction, user, parsedCustomId }) {
		const embed = interaction.message.embeds[0]
		const yesOrNo = parsedCustomId[2] as 'y' | 'n'

		const data = parsedCustomId[3].split(',')
		const userId = data[0]
		const claimBirthdayYear = Number.parseInt(data[1])
		const claimCardId = Number.parseInt(data[2])
		const claimCard = await archive.getCardDetailsById(claimCardId)

		if (!claimCard) return cancelConfirmationResponse('No card found in the archive.')

		const cardName = archive.getCardFullName({ card: claimCard })

		if (embed) {
			embed.title = undefined
			embed.description = `\`\`\`less\n[#${claimCardId}] ${cardName}\`\`\``
		}

		if (user.id !== userId) return simpleEphemeralResponse('This is not your confirmation.')

		if (yesOrNo === 'n') return cancelConfirmationResponse(undefined, { oldEmbed: embed })

		const userProfile = await db.findProfileWithDiscordId(bot.prisma, user.id)
		if (!userProfile || !userProfile.birthday) return cancelConfirmationResponse('No birthday set.')

		const userCatcha = await catchaDB.findCatcha(bot.prisma, user.id)
		if (!userCatcha) return cancelConfirmationResponse('No Catcha found.')

		if (userCatcha.lastBirthdayCardClaimed && userCatcha.lastBirthdayCardClaimed >= claimBirthdayYear) {
			return cancelConfirmationResponse(`You've already claimed a card for your ${claimBirthdayYear} birthday.`)
		}

		await catchaDB.claimBirthdayCard(bot.prisma, userCatcha.userUuid, claimBirthdayYear, claimCardId)

		return {
			type: DAPI.InteractionResponseType.UpdateMessage,
			data: {
				content: `Birthday card claimed.`,
				embeds: embed ? [embed] : undefined,
				components: [],
			},
		}
	},
} as Subcommand
