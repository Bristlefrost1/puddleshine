import * as archive from '#commands/catcha/archive/archive.js';

type Art = {
	artUrl?: string;

	artCredit?: string;
	artText: string;

	artNumber?: number;
	totalArt?: number;
};

const NO_ART_PROVIDED = 'No art provided';

function getVariantDataIndex(
	cardDetails: NonNullable<ReturnType<typeof archive.getCardDetailsById>>,
	variant?: string | number,
) {
	if (variant !== undefined && cardDetails.variants && cardDetails.variants.length > 0) {
		if (typeof variant === 'string') {
			const indexes = cardDetails.variantDataIndexes as {
				[variant: string]: number | undefined;
			};
			const variantIndex = indexes[variant];

			if (variantIndex !== undefined) return variantIndex;
		} else {
			return variant;
		}
	}
}

function createArtArray(
	cardDetails: NonNullable<ReturnType<typeof archive.getCardDetailsById>>,
	variantDataIndex?: number,
) {
	let artArray: typeof cardDetails.art;

	if (variantDataIndex !== undefined) {
		if (!cardDetails.variants || !cardDetails.variants[variantDataIndex]) return;
		if (!cardDetails.variants[variantDataIndex].art || cardDetails.variants[variantDataIndex].art.length < 1)
			return;

		artArray = cardDetails.variants![variantDataIndex].art;
	} else {
		if (!cardDetails.art || cardDetails.art.length < 1) return;
		artArray = cardDetails.art!;
	}

	return artArray;
}

function getArtCount(cardId: number, variant?: string | number) {
	const cardDetails = archive.getCardDetailsById(cardId);

	if (!cardDetails) return 0;

	const variantDataIndex = getVariantDataIndex(cardDetails, variant);
	const artArray = createArtArray(cardDetails, variantDataIndex);

	if (artArray === undefined) return 0;

	return artArray.length;
}

function getArtNumbered(cardId: number, artNumber: number, variant?: string | number): Art {
	const cardDetails = archive.getCardDetailsById(cardId);

	if (!cardDetails) return { artText: NO_ART_PROVIDED };

	const variantDataIndex = getVariantDataIndex(cardDetails, variant);
	const artArray = createArtArray(cardDetails, variantDataIndex);

	if (!artArray) return { artText: NO_ART_PROVIDED };

	const artIndex = artNumber - 1;
	const art = artArray[artIndex];

	return {
		artUrl: art.url,

		artCredit: art.credit,
		artText: `Art ${artIndex + 1}/${artArray.length} (${art.credit})`,

		artNumber: artIndex + 1,
		totalArt: artArray.length,
	};
}

function randomArt(cardId: number, inverted?: boolean, variant?: string | number): Art {
	const cardDetails = archive.getCardDetailsById(cardId);

	if (!cardDetails) return { artText: NO_ART_PROVIDED };

	const variantDataIndex = getVariantDataIndex(cardDetails, variant);
	const artArray = createArtArray(cardDetails, variantDataIndex);

	if (!artArray) return { artText: NO_ART_PROVIDED };

	const randomArtIndex = Math.floor(Math.random() * artArray.length);
	const randomArt = artArray[randomArtIndex];

	return {
		artUrl: randomArt.url,

		artCredit: randomArt.credit,
		artText: `Art ${randomArtIndex + 1}/${artArray.length} (${randomArt.credit})`,

		artNumber: randomArtIndex + 1,
		totalArt: artArray.length,
	};
}

export { getVariantDataIndex, getArtCount, getArtNumbered, randomArt };
