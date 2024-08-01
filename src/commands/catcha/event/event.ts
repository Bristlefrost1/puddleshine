import events from '#resources/.compiled/events.compiled.json' with { type: 'json' };

const EVENT_KV_KEY = 'CatchaEvent';

async function getCurrentEvent(env: Env) {
	const kvEvent = await env.KV.get(EVENT_KV_KEY);

	if (!kvEvent) return;

	const eventIndex = events.eventIndexes[kvEvent as keyof typeof events.eventIndexes];
	const eventData = events.events[eventIndex];

	return eventData;
}

async function randomizeNewEvent(env: Env) {
	const allEvents = events.events;
	const oldEvent = await env.KV.get(EVENT_KV_KEY);

	// Randomly pick a new event
	let newEvent = allEvents[Math.floor(Math.random() * allEvents.length)];

	// Prevent the new event being the same as the old one
	while (newEvent.event === oldEvent) {
		newEvent = allEvents[Math.floor(Math.random() * allEvents.length)];
	}

	// Store the new event
	await env.KV.put(EVENT_KV_KEY, newEvent.event);
}

export { getCurrentEvent, randomizeNewEvent };
