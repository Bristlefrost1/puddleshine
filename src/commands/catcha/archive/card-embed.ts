import * as DAPI from 'discord-api-types/v10'

import { getCardDetailsById, type ArchiveCard, getCardColour, getCardShortName } from './archive'
import { createStarString } from '@/utils/star-string'
import * as config from '@/config'

export async function buildCardEmbed(options: {
	ownerUsername?: string

	cardId: number
	cardUuid?: string
	cardName: string
	gender: string
	clan: string
	rarity: number

	isInverted: boolean

	variant?: string
	variantDescription?: string

	obtainedFrom?: string
	obtainedAtUnixTime?: number

	untradeable?: boolean

	artUrl?: string
	artText: string
}): Promise<DAPI.APIEmbed> {
	const archiveCard = await getCardDetailsById(options.cardId) as ArchiveCard
	let title = ''

	if (options.ownerUsername !== undefined) {
		title = `${options.ownerUsername}'s ${options.cardName}`
	} else {
		title = options.cardName
	}

	const cardColour = getCardColour(options.isInverted, options.variant !== undefined)
	const descriptionLines: string[] = []

	descriptionLines.push(`Name: ${options.cardName}`);
	descriptionLines.push(`Clan: ${options.clan}`);
	descriptionLines.push(`Gender: ${options.gender}`);
	descriptionLines.push(`Rarity: ${createStarString(options.rarity, options.isInverted)} (${options.rarity})`)

	if (options.isInverted === true) {
		descriptionLines.push(`> **A rare inverted (flipped) card!**`)
	}

	if (options.variant !== undefined) {
		descriptionLines.push(
			`> **A rare ${options.variant} variant of ${getCardShortName({ card: archiveCard, inverted: false, addDisambiguator: true })}!**`,
		)
	}

	if (options.variantDescription !== undefined) {
		descriptionLines.push('\n')
		descriptionLines.push(options.variantDescription)
	}

	const embedFields: DAPI.APIEmbedField[] = []

	embedFields.push({
		name: 'Card',
		value: `Card ID: ${options.cardId}${options.cardUuid !== undefined ? `\nCard UUID: ${options.cardUuid}` : ''}${options.untradeable ? '\nThis card cannot be traded.' : ''}`,
		inline: false,
	})

	if (options.obtainedFrom !== undefined && options.obtainedAtUnixTime !== undefined) {
		embedFields.push({
			name: 'Obtained',
			value: `Obtained from: ${options.obtainedFrom}\nObtained at: <t:${options.obtainedAtUnixTime}:F> (<t:${options.obtainedAtUnixTime}:R>)`,
			inline: false,
		})
	}

	return {
		title: title,
		description: descriptionLines.join('\n'),
		color: cardColour,

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
	}
}
