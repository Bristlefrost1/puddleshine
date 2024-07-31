import * as fs from 'node:fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// Compile cards
const cardFileData = fs.readFileSync('./resources/cards/cards.json', 'utf-8');
const cardsArray = JSON.parse(cardFileData);

const newCardsArray = [];

const catIds5s = [];
const catIds4s = [];
const catIds3s = [];
const catIds2s = [];
const catIds1s = [];

for (let card of cardsArray) {
	/** @type {number} */
	const catId = card.id;
	/** @type {number} */
	const rarity = card.rarity;

	switch (rarity) {
		case 1:
			catIds1s.push(catId);
			break;
		case 2:
			catIds2s.push(catId);
			break;
		case 3:
			catIds3s.push(catId);
			break;
		case 4:
			catIds4s.push(catId);
			break;
		case 5:
			catIds5s.push(catId);
			break;
		default:
			console.error(`ID ${catId} doesn't have a rarity`);
			continue;
	}

	if (card.art && card.art.length > 0) {
		for (let i = 0; i < card.art.length; i++) {
			if (card.art[i] && card.art[i].url && typeof card.art[i].url === 'string') {
				card.art[i].url = card.art[i].url.replace('$ART_URL_BASE$', process.env.ART_URL_BASE);
			}
		}
	}

	if (card.variants && card.variants.length > 0) {
		let variantDataIndexes = {};

		for (let i = 0; i < card.variants.length; i++) {
			const variantData = card.variants[i];
			variantDataIndexes[variantData.variant] = i;

			if (variantData.art && variantData.art.length > 0) {
				for (let j = 0; j < variantData.art.length; j++) {
					if (variantData.art[j] && variantData.art[j].url && typeof variantData.art[j].url === 'string') {
						card.variants[i].art[j].url = card.variants[i].art[j].url.replace(
							'$ART_URL_BASE$',
							process.env.ART_URL_BASE,
						);
					}
				}
			}
		}

		card.variantDataIndexes = variantDataIndexes;
	}

	newCardsArray.push(card);
}

const compiledCards = {
	archive: newCardsArray,
	idsByRarity: [catIds1s, catIds2s, catIds3s, catIds4s, catIds5s],
};

const compiledCardsJson = JSON.stringify(compiledCards);
try {
	fs.writeFileSync('./resources/.compiled/cards.compiled.json', compiledCardsJson);
} catch (err) {
	console.error(err);
}

// Compile events
const eventFileData = fs.readFileSync('./resources/events/events.json', 'utf-8');
const eventsData = JSON.parse(eventFileData);

const eventIndexes = {};

for (let i = 0; i < eventsData.events.length; i++) {
	const event = eventsData.events[i].event;
	eventIndexes[event] = i;
}

eventsData.eventIndexes = eventIndexes;

const compiledEventsJson = JSON.stringify(eventsData);
try {
	fs.writeFileSync('./resources/.compiled/events.compiled.json', compiledEventsJson);
} catch (err) {
	console.error(err);
}
