import * as fs from 'node:fs'

const data = fs.readFileSync('./cards.txt', 'utf-8')
const lines = data.split('\n')

const sqlFileLines = []

const importDate = new Date()
const importTimeString = importDate.toISOString()
const importStartedMs = importDate.getTime()

let importedCardNumber = 1

for (const line of lines) {
	const splitLine = line.split(' ')

	const cardId = Number.parseInt(splitLine[1].replace('[', '').replace(']', '').replace('#', ''))
	let isInverted = false

	if (isNaN(cardId)) {
		console.error(`Error converting the ID of line: ${line}`)
		process.exit(1)
	}

	const starString = splitLine.pop()

	if (!starString) {
		console.error(`Error getting the star string of line: ${line}`)
		process.exit(1)
	}

	if (starString.at(0) === '☆') isInverted = true;

	let variant = undefined

	if (splitLine[2] === 'Squilf') {
		variant = 'Short'
	} else if (splitLine[2] === 'Prom' && splitLine[3] === 'Date' && splitLine[4] === 'Hawkfrost') {
		variant = 'Mistake'
	} else if (splitLine[2] === 'Rainbow' && splitLine[3] === 'Dovewing') {
		variant = 'Rainbow'
	} else if (splitLine[2] === 'Gray' && splitLine[3] === 'Wings') {
		variant = 'Angel'
	} else if (splitLine[2] === 'Pridestar') {
		variant = 'Pride'
	}

	const randomCardUuid = crypto.randomUUID()
	const obtainedAt = new Date(importStartedMs + importedCardNumber).toISOString()

	let cardSql = ''
	let cardHistorySql = ''

	if (variant === undefined) {
		cardSql = `INSERT INTO catcha_cards (uuid, card_id, owner_uuid, is_inverted, obtained_at, obtained_from) VALUES ('${randomCardUuid}', ${cardId}, $OWNER_UUID$, ${isInverted ? '1' : '0'}, '${obtainedAt}', 'I');`
	} else {
		cardSql = `INSERT INTO catcha_cards (uuid, card_id, owner_uuid, is_inverted, obtained_at, obtained_from, variant) VALUES ('${randomCardUuid}', ${cardId}, $OWNER_UUID$, ${isInverted ? '1' : '0'}, '${obtainedAt}', 'I', '${variant}');`
	}

	cardHistorySql = `INSERT INTO catcha_card_history_events (card_uuid, timestamp, event, user_uuid) VALUES ('${randomCardUuid}', '${importTimeString}', 'I', $OWNER_UUID$);`

	sqlFileLines.push(cardSql)
	sqlFileLines.push(cardHistorySql)

	importedCardNumber++
}

try {
	fs.writeFileSync('./cards.sql', sqlFileLines.join('\n'))
} catch (err) {
	console.error(err)
}
