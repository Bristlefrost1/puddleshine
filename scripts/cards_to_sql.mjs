import * as fs from 'node:fs';

const data = fs.readFileSync('./cards.txt', 'utf-8');
const lines = data.split('\n');

const sqlFileLines = [];

const importDate = new Date();
const importTimeString = importDate.toISOString();
const importStartedMs = importDate.getTime();

let importedCardNumber = 1;

for (const line of lines) {
	const splitLine = line.split(' ');

	const cardId = Number.parseInt(splitLine[1].replace('[', '').replace(']', '').replace('#', ''));
	let isInverted = false;

	if (isNaN(cardId)) {
		console.error(`Error converting the ID of line: ${line}`);
		process.exit(1);
	}

	const starString = splitLine.pop();

	if (!starString) {
		console.error(`Error getting the star string of line: ${line}`);
		process.exit(1);
	}

	if (starString.at(0) === '☆') isInverted = true;

	const randomCardUuid = crypto.randomUUID();
	const obtainedAt = new Date(importStartedMs + importedCardNumber).toISOString();

	const cardSql = `INSERT INTO catcha_cards (uuid, card_id, owner_uuid, is_inverted, obtained_at, obtained_from) VALUES ('${randomCardUuid}', ${cardId}, $OWNER_UUID$, ${isInverted ? '1' : '0'}, '${obtainedAt}', 'I');`;
	const cardHistorySql = `INSERT INTO catcha_card_history_events (card_uuid, timestamp, event, user_uuid) VALUES ('${randomCardUuid}', '${importTimeString}', 'I', $OWNER_UUID$);`;

	sqlFileLines.push(cardSql);
	sqlFileLines.push(cardHistorySql);

	importedCardNumber++;
}

try {
	fs.writeFileSync('./cards.sql', sqlFileLines.join('\n'));
} catch (err) {
	console.error(err);
}
