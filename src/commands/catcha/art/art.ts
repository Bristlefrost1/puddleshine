import { bot } from '@/bot'
import * as archive from '@/commands/catcha/archive'

export type Art = {
	artUrl?: string

	artCredit?: string
	artText: string

	artNumber?: number
	totalArt?: number
}

const NO_ART_PROVIDED = 'No art provided'

export function getArtArray(card: archive.ArchiveCard, variant?: string | number) {
	let artArray: archive.ArchiveArt[] = []

	if (variant !== undefined) {
		const cardVariant = archive.getCardVariant(card, variant)
		if (!cardVariant) return

		if (cardVariant.art === undefined || cardVariant.art.length === 0) return

		artArray = cardVariant.art
	} else {
		if (card.art === undefined || card.art.length === 0) return
		artArray = card.art
	}

	artArray = artArray.map((archiveArt) => {
		archiveArt.url = archiveArt.url.replace('$ART_URL_BASE$', `${bot.env.PUBLIC_BUCKET_URL}/catcha-art`)
		
		return archiveArt
	})

	return artArray
}

export function getArtCount(card: archive.ArchiveCard, variant?: string | number): number {
	const artArray = getArtArray(card, variant)

	if (artArray === undefined) return 0

	return artArray.length
}

export function getArtNumbered(card: archive.ArchiveCard, artNumber: number, variant?: string | number): Art {
	const artArray = getArtArray(card, variant)

	if (!artArray) return { artText: NO_ART_PROVIDED }

	const artIndex = artNumber - 1
	const art = artArray[artIndex]

	return {
		artUrl: art.url,

		artCredit: art.credit,
		artText: `Art ${artIndex + 1}/${artArray.length} (${art.credit})`,

		artNumber: artIndex + 1,
		totalArt: artArray.length,
	}
}

export function randomArt(card: archive.ArchiveCard, inverted?: boolean, variant?: string | number): Art {
	const artArray = getArtArray(card, variant)

	if (!artArray) return { artText: NO_ART_PROVIDED }

	const randomArtIndex = Math.floor(Math.random() * artArray.length)
	const randomArt = artArray[randomArtIndex]

	return {
		artUrl: randomArt.url,

		artCredit: randomArt.credit,
		artText: `Art ${randomArtIndex + 1}/${artArray.length} (${randomArt.credit})`,

		artNumber: randomArtIndex + 1,
		totalArt: artArray.length,
	}
}
