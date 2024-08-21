import * as pelt from '#cat/pelts.js';
import * as eyes from '#cat/eyes.js';

import type { Kit } from '#commands/nursery/game/kit.js';
import type { Pelt } from '#cat/pelts.js';
import type { Eyes } from '#cat/eyes.js';

function buildNurseryStatusView(options: {
	displayName: string;

	season: string;

	foodPoints: number;
	nextFoodPointPercetage?: number;

	kits?: Kit[];
}) {
	const lines: string[] = [];

	lines.push('```');
	lines.push(`${options.displayName}'s nursery [${options.season}]`);
	lines.push(
		`Food Meter: ${options.foodPoints} (${options.nextFoodPointPercetage !== undefined ? options.nextFoodPointPercetage.toFixed(1) + '%' : 'Full'})`,
	);
	lines.push('');
	lines.push('You have no alerts.');
	lines.push('');

	if (options.kits && options.kits.length > 0) {
		for (let i = 0; i < options.kits.length; i++) {
			const kitNumber = i + 1;
			const kit = options.kits[i];

			const age = kit.age.toFixed(2);
			const health = (kit.health * 100).toFixed(1);
			const hunger = (kit.hunger * 100).toFixed(1);
			const bond = (kit.bond * 100).toFixed(1);

			lines.push(`[${kitNumber}] ${kit.fullName}:`);
			lines.push(`- Age: ${age} moons | Health: ${health}% | Hunger: ${hunger}% | Bond: ${bond}% | Temp: Good`);
		}
	} else {
		lines.push("You don't have any kits. Try /nursery breed to get some!");
	}

	lines.push('```');

	return lines.join('\n');
}

function buildNurseryHomeView(options: {
	displayName: string;

	season: string;

	foodPoints: number;
	nextFoodPointPercetage?: number;

	kits?: {
		name: string;
		pelt: string;
		eyes: string;
		gender?: string;
	}[];
}) {
	const lines: string[] = [];

	lines.push('```');
	lines.push(`${options.displayName}'s nursery [${options.season}]`);
	lines.push(
		`Food Meter: ${options.foodPoints} (${options.nextFoodPointPercetage !== undefined ? options.nextFoodPointPercetage.toFixed(1) + '%' : 'Full'})`,
	);
	lines.push('');

	if (options.kits && options.kits.length > 0) {
		for (let i = 0; i < options.kits.length; i++) {
			const kitNumber = i + 1;
			const kit = options.kits[i];

			const kitPelt = pelt.stringifyPelt(JSON.parse(kit.pelt) as Pelt);
			const kitEyes = eyes.stringifyEyes(JSON.parse(kit.eyes) as Eyes);

			let gender = kit.gender?.toLowerCase() ?? 'kit';
			if (gender === '') gender = 'kit';

			lines.push(`[${kitNumber}] ${kit.name}: ${kitPelt} ${gender} with ${kitEyes}`);
		}
	} else {
		lines.push("You don't have any kits. Try /nursery breed to get some!");
	}

	lines.push('```');

	return lines.join('\n');
}

export { buildNurseryStatusView, buildNurseryHomeView };
