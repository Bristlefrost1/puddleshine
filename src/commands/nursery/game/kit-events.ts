import type { Kit } from './kit.js';

import * as config from '#config.js';

enum KitEventType {
	Feed = 'Feed',
}

type KitEvent = {
	type: KitEventType;
	timestamp: string; // ISO timestamp
	description: string;
};

function addNewEventToKit(kit: Kit, type: KitEventType, description: string, date?: Date) {
	const eventTimestamp = date?.toISOString() ?? new Date().toISOString();

	const newEvent: KitEvent = {
		type,
		timestamp: eventTimestamp,
		description,
	};

	kit.events.push(newEvent);
	kit.events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
	kit.events = kit.events.slice(undefined, config.NURSERY_MAX_KIT_EVENTS);
}

export { KitEventType, addNewEventToKit };
export type { KitEvent };
