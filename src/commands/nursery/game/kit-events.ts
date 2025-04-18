import { type Kit } from './kit'

import * as config from '@/config'

export enum KitEventType {
	Feed = 'Feed',
	Comfort = 'Comfort',
	Groom = 'Groom',
	Play = 'Play',
	Medicine = 'Medicine',
	Found = 'Found',
}

export type KitEvent = {
	type: KitEventType
	timestamp: number // Unix timestamp
	description: string
}

export function addNewEventToKit(kit: Kit, type: KitEventType, description: string, date?: Date) {
	const eventTimestamp = Math.floor((date?.getTime() ?? new Date().getTime()) / 1000)

	const newEvent: KitEvent = {
		type,
		timestamp: eventTimestamp,
		description,
	}

	kit.events.push(newEvent)
	kit.events.sort((a, b) => b.timestamp - a.timestamp)
	kit.events = kit.events.slice(undefined, config.NURSERY_MAX_KIT_EVENTS)
}

export function findLastEventofType(kit: Kit, type: KitEventType) {
	for (const event of kit.events) {
		if (event.type === type) return event
	}
}
