export function parseList(list: string, onlyNumbers?: boolean) {
	const listItems = list
		.split(',')
		.map((value) => value.trim().split(' '))
		.flat()
		.map((value) => value.trim())
		.filter((value) => value !== '')

	if (onlyNumbers) return listItems.map((value) => Number.parseInt(value)).filter((value) => !isNaN(value))

	return listItems
}
