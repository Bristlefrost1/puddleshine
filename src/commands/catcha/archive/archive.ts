import JSON5 from 'json5'

import { bot } from '@/bot'
import * as config from '@/config'

export type ArchiveArt = {
	/**
	 * The url of the art image.
	 */
	url: string

	/**
	 * The credit line displayed below the artwork when it's shown in the bot.
	 * Use the artist's name/social media handle/whatever depending on how they would like to be credited.
	 */
	credit: string
}

export type ArchiveCardVariant = {
	/**
	 * The ID of the variant. Stored in the database and shown on the card.
	 */
	variant: string

	/**
	 * The name that will replace the base card's name.
	 */
	name: string

	/**
	 * The description/quote on the variant card.
	 */
	description: string

	/**
	 * Whether the variant can be rolled.
	 */
	unrollable?: boolean

	/**
	 * The variant art that will be displayed instead of the base card's art.
	 */
	art?: ArchiveArt[]
}

export type ArchiveCardVariantWithIndex = ArchiveCardVariant & { index: number }

export type ArchiveCard = {
	/**
	 * The card ID.
	 */
	id: number

	/**
	 * The rarity of the card from 1 to 5 with 1 being the most common & 5 being the rarest.
	 */
	rarity: number

	/**
	 * The name of the card.
	 */
	name: string

	/**
	 * The group to which the card belongs (can be a clan, kittypet, rogue, etc).
	 */
	group: string

	/**
	 * The gender of the cat, if known (empty string if unknown).
	 */
	gender: string

	/**
	 * The disambiguator without the brackets when there's another card with the same name. Use an arc/book acronym.
	 * Will be an empty string if there's no disambiguator.
	 */
	disambiguator: string

	/**
	 * If the card should only be shown in certain guilds, their guild IDs.
	 */
	onlyGuildIds?: string[]

	/**
	 * The card's art if there's any.
	 */
	art?: ArchiveArt[]

	/**
	 * Variants of the card if there are any.
	 */
	variants?: ArchiveCardVariant[]
}

export type Archive = ArchiveCard[]

const ARCHIVE_R2_OBJECT = 'archive.jsonc'

export let cachedArchive: Archive | undefined = undefined

export async function getArchive() {
	if (cachedArchive !== undefined) return cachedArchive

	const archiveR2Object = await bot.env.BUCKET.get(ARCHIVE_R2_OBJECT)
	if (archiveR2Object === null) throw `No ${ARCHIVE_R2_OBJECT} found in the bucket.`

	const archiveText = await archiveR2Object.text()
	const archive: Archive = JSON5.parse(archiveText)

	if (cachedArchive === undefined) {
		cachedArchive = archive
	}

	return archive
}

export async function getCardDetailsById(cardId: number): Promise<ArchiveCard | undefined> {
	try {
		const archive = await getArchive()

		return archive.find((card) => card.id === cardId)
	} catch {
		return undefined
	}
}

export function getCachedCardDetailsById(cardId: number): ArchiveCard | undefined {
	if (cachedArchive === undefined) return undefined

	return cachedArchive.find((card) => card.id === cardId)
}

export function getCardDetailsByArchiveAndId(archive: Archive, cardId: number): ArchiveCard | undefined {
	return archive.find((card) => card.id === cardId)
}

export async function getAllCardIds() {
	const cardIds = new Array<number>()
	const archive = await getArchive()
	
	for (let i = 0; i < archive.length; i++) {
		cardIds.push(i)
	}

	return cardIds
}

export async function getCardIdsByRarity(archiveOption?: Archive) {
	const cardIdsSortedByRarity = new Map<number, Array<number>>()
	const archive = archiveOption ?? await getArchive()
	
	for (let i = 0; i < archive.length; i++) {
		const card = archive[i]
		const cardId = card.id
		const rarity = card.rarity

		const cardIdsWithRarity = cardIdsSortedByRarity.get(rarity) ?? []

		cardIdsWithRarity.push(cardId)
		cardIdsSortedByRarity.set(rarity, cardIdsWithRarity)
	}

	return cardIdsSortedByRarity
}

export function getCardShortName(options: {
	card: ArchiveCard
	inverted?: boolean
	variant?: number | string
	addDisambiguator?: boolean
}): string {
	const { card, inverted, variant, addDisambiguator } = options

	let name = card.name
	let isVariant = false

	if (variant !== undefined && card.variants && card.variants.length > 0) {
		if (typeof variant === 'number') {
			const variantData = card.variants[variant]

			name = variantData.name
			isVariant = true
		} else {
			for (const variantData of card.variants) {
				if (variantData.variant.toLowerCase() === variant.toLowerCase() || variantData.name.toLowerCase() === variant.toLowerCase()) {
					name = variantData.name
					isVariant = true
				}
			}
		}
	}

	if (addDisambiguator) {
		if (!isVariant && card.disambiguator.length > 0) { // The variant name should disambiguate enough
			name = `${name} (${card.disambiguator})`
		}
	}

	if (inverted) name = `Inverted ${name}`

	return name
}

export function getCardFullName(options: {
	card: ArchiveCard,
	inverted?: boolean,
	variant?: number | string
}): string {
	const { card, inverted, variant } = options

	let cardName = getCardShortName({ card, inverted, variant, addDisambiguator: false })
	let disambiguator = ''

	if (variant === undefined && card.disambiguator.length > 0) {
		disambiguator = ` (${card.disambiguator})`
	}

	if (card.group === 'Kittypet' || card.group === 'Loner' || card.group === 'Rogue') {
		cardName = `${cardName} the ${card.group.toLowerCase()}${disambiguator}`
	} else {
		cardName = `${cardName} from ${card.group}${disambiguator}`
	}

	return cardName
}

export function getCardVariant(card: ArchiveCard, variant?: string | number): ArchiveCardVariantWithIndex | undefined {
	// No variants, return nothing
	if (card.variants === undefined || card.variants.length === 0) return

	let variantIndex = typeof variant === 'number' ? variant : undefined

	if (typeof variant === 'string') {
		card.variants.forEach((cardVariant, index) => {
			if (cardVariant.variant.toLowerCase() === variant.toLowerCase() || cardVariant.name.toLowerCase() === variant.toLowerCase()) {
				variantIndex = index
			}
		})
	}

	if (variantIndex === undefined) return
	if (card.variants[variantIndex] === undefined) return

	return { ...card.variants[variantIndex], index: variantIndex }
}

/**
 * Search the archive for card IDs by name.
 * 
 * @param searchTerm The name of the card to search for.
 * @returns The card IDs of the cards whose names start with the search term.
 */
export async function searchForCards(searchTerm: string): Promise<ArchiveCard[]> {
	const results: ArchiveCard[] = []
	const lowercaseSearchTerm = searchTerm.toLocaleLowerCase('en')

	const wholeArchive = await getArchive()

	for (const card of wholeArchive) {
		const fullName = getCardFullName({ card: card, inverted: false, variant: undefined })

		if (fullName.toLocaleLowerCase('en').startsWith(lowercaseSearchTerm)) {
			results.push(card)
		}
	}

	return results
}

export async function saveArchive(archive: Archive) {
	const archiveJson = JSON.stringify(archive, undefined, '\t')
	const newArchiveObject = await bot.env.BUCKET.put(ARCHIVE_R2_OBJECT, archiveJson)

	if (newArchiveObject) {
		cachedArchive = archive
	}

	return archive
}

export function getCardColour(isInverted: boolean, isVariant: boolean): number | undefined {
	if (isInverted && isVariant) {
		return config.INVERTED_VARIANT_COLOUR
	} else if (isVariant) {
		return config.VARIANT_COLOUR
	} else if (isInverted) {
		return config.INVERTED_COLOUR
	}

	return
}
