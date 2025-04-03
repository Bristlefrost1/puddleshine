import * as DAPI from 'discord-api-types/v10'

import * as art from './art'
import * as archive from '@/commands/catcha/archive'
import { messageResponse, simpleEphemeralResponse } from '@/discord/responses'
import { findActionRowWithComponentCustomId } from '@/utils/action-row-utils'

import * as config from '@/config'

function buildArtDataString(cardId: number, inverted?: boolean, variantIndex?: number) {
	const cardIdString = cardId.toString()
	let invertedString = ''
	let variantString = ''

	if (inverted !== undefined) {
		invertedString = inverted ? '1' : '0'
	}

	if (variantIndex !== undefined) {
		variantString = variantIndex.toString()
	}

	return `${cardIdString},${invertedString},${variantString}`
}

function parseArtDataString(artDataString: string) {
	const data = artDataString.split(',')

	const cardId = Number.parseInt(data[0])
	const isInverted = data[1] === '' ? false : Boolean(Number.parseInt(data[1]))
	const variantIndex = data[2] === '' ? undefined : Number.parseInt(data[2])

	return { cardId, isInverted, variantIndex }
}

export function buildArtScrollComponents(
	cardId: number,
	artNumber: number,
	inverted?: boolean,
	variantIndex?: number,
): DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[] {
	const dataString = buildArtDataString(cardId, inverted, variantIndex)

	return [
		{
			type: DAPI.ComponentType.ActionRow,
			components: [
				{
					type: DAPI.ComponentType.Button,
					custom_id: `catcha/art/prev/${dataString}:${artNumber}`,
					style: DAPI.ButtonStyle.Secondary,
					label: '← Previous Art',
				},
				{
					type: DAPI.ComponentType.Button,
					custom_id: `catcha/art/next/${dataString}:${artNumber}`,
					style: DAPI.ButtonStyle.Secondary,
					label: 'Next Art →',
				},
			],
		},
	]
}

export async function handleArtScroll(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[],
): Promise<DAPI.APIInteractionResponse> {
	const embed = interaction.message.embeds[0]

	const nextOrPrev: 'next' | 'prev' = parsedCustomId[2] as any
	const artDataStringSplit = parsedCustomId[3].split(':')
	const artData = parseArtDataString(artDataStringSplit[0])
	const oldArtNumber = Number.parseInt(artDataStringSplit[1])

	let newArtNumber = oldArtNumber

	if (nextOrPrev === 'next') {
		newArtNumber++
	} else if (nextOrPrev === 'prev') {
		newArtNumber--
	}

	const card = await archive.getCardDetailsById(artData.cardId)
	if (!card) return simpleEphemeralResponse('Something went wrong')

	const artCount = art.getArtCount(card, artData.variantIndex)

	if (newArtNumber > artCount) {
		newArtNumber = 1
	} else if (newArtNumber < 1) {
		newArtNumber = artCount
	}

	const newArt = art.getArtNumbered(card, newArtNumber, artData.variantIndex)

	if (newArt.artUrl) {
		embed.image = {
			url: newArt.artUrl,
			width: config.CATCHA_CARD_IMAGE_WIDTH,
		}
	} else {
		embed.image = undefined
	}

	if (embed.footer) {
		embed.footer.text = newArt.artText
	} else {
		embed.footer = {
			text: newArt.artText,
		}
	}

	let components = interaction.message.components

	if (components) {
		let oldActionRow = findActionRowWithComponentCustomId(components, 'catcha/art/')

		if (oldActionRow) {
			const oldArtScrollActionRow = oldActionRow.actionRow
			const oldArtScrollActionRowIndex = oldActionRow.actionRowIndex

			if (newArt.totalArt && newArt.artNumber && newArt.totalArt > 1) {
				if (oldArtScrollActionRow && oldArtScrollActionRowIndex !== undefined) {
					components[oldArtScrollActionRowIndex].components = buildArtScrollComponents(
						artData.cardId,
						newArt.artNumber,
						artData.isInverted,
						artData.variantIndex,
					)[0].components
				} else {
					components.push(
						buildArtScrollComponents(
							artData.cardId,
							newArt.artNumber,
							artData.isInverted,
							artData.variantIndex,
						)[0]
					)
				}
			}
		}
		
	} else {
		if (newArt.totalArt && newArt.artNumber && newArt.totalArt > 1) {
			components = buildArtScrollComponents(
				artData.cardId,
				newArt.artNumber,
				artData.isInverted,
				artData.variantIndex,
			)
		}
	}

	return messageResponse({ update: true, embeds: [embed], components })
}
