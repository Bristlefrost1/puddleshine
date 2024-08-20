import * as config from '#config.js';

import type { NurseryKit } from '@prisma/client';

function calculateAgeMoons(kit: NurseryKit) {
	const ageMoons = kit.ageMoons;

	const currentTimestamp = Math.floor(new Date().getTime() / 1000);
	const ageLastUpdatedAt = Math.floor(kit.ageUpdated.getTime() / 1000);
	const secondsSinceLastUpdate = currentTimestamp - ageLastUpdatedAt;

	return ageMoons + secondsSinceLastUpdate * config.NURSERY_KIT_AGE_PER_SECOND;
}

export { calculateAgeMoons };
