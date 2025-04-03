export function createStarString(rarity: number, inverted?: boolean) {
	if (inverted) {
		return '☆'.repeat(rarity)
	} else {
		return '★'.repeat(rarity)
	}
}
