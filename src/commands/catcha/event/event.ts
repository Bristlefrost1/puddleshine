import JSON5 from 'json5'

import { bot } from '@/bot'

export type EventIncrease = {
	rarity?: 1 | 2 | 3 | 4 | 5
	group?: string
}

export type Event = {
	event: string
	eventText: string

	increase: EventIncrease
	increaseBy: number
}

export type Events = Event[]
export type EventsArchive = { events: Events }

const EVENTS_R2_OBJECT = 'events.jsonc'
const EVENT_KV_KEY = 'CatchaEvent'

let cachedEventsArchive: EventsArchive | undefined = undefined

export async function getEventsArchive() {
	if (cachedEventsArchive !== undefined) return cachedEventsArchive
	
	const eventsArchiveObject = await bot.env.BUCKET.get(EVENTS_R2_OBJECT)
	if (eventsArchiveObject === null) throw `No ${EVENTS_R2_OBJECT} found in the bucket.`
	
	const text = await eventsArchiveObject.text()
	const eventsArchive: EventsArchive = JSON5.parse(text)

	if (cachedEventsArchive === undefined) {
		cachedEventsArchive = eventsArchive
	}
	
	return eventsArchive
}

export function findEventInArchive(event: string, archive: EventsArchive) {
	const lowercaseEvent = event.toLowerCase()

	return archive.events.find((eventObject) => eventObject.event.toLowerCase() === lowercaseEvent)
}

export async function getCurrentEvent() {
	const eventsArchive = await getEventsArchive()
	const kvEvent = await bot.env.KV.get(EVENT_KV_KEY)

	if (!kvEvent) return

	return findEventInArchive(kvEvent, eventsArchive)
}

export async function randomiseNewEvent() {
	const allEvents = (await getEventsArchive()).events
	const oldEvent = await bot.env.KV.get(EVENT_KV_KEY)

	// Randomly pick a new event
	let newEvent = allEvents[Math.floor(Math.random() * allEvents.length)]

	// Prevent the new event being the same as the old one
	while (newEvent.event === oldEvent) {
		newEvent = allEvents[Math.floor(Math.random() * allEvents.length)]
	}

	// Store the new event
	await bot.env.KV.put(EVENT_KV_KEY, newEvent.event)
}
