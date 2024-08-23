import { messageResponse } from '#discord/responses.js';

import * as pelt from '#cat/pelts.js';
import * as eyes from '#cat/eyes.js';

import type { Nursery } from './game/nursery-manager.js';

function buildNurseryStatusView(nursery: Nursery) {
	const lines: string[] = [];

	let nextFoodPoint = '';

	if (nursery.food.foodPoints >= nursery.food.max) {
		nextFoodPoint = 'Full';
	} else {
		if (nursery.food.nextFoodPointPercentage) {
			nextFoodPoint = nursery.food.nextFoodPointPercentage.toFixed(1).toString() + '%';
		} else {
			nextFoodPoint = '0%';
		}
	}

	lines.push('```');
	lines.push(`${nursery.displayName}'s nursery [Greenleaf]`);
	lines.push(`Food Meter: ${nursery.food.foodPoints} (${nextFoodPoint})`);
	lines.push('');
	lines.push('You have no alerts.');
	lines.push('');

	if (nursery.kits && nursery.kits.length > 0) {
		for (let i = 0; i < nursery.kits.length; i++) {
			const kitNumber = i + 1;
			const kit = nursery.kits[i];

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

function buildNurseryHomeView(nursery: Nursery) {
	const lines: string[] = [];

	let nextFoodPoint = '';

	if (nursery.food.foodPoints >= nursery.food.max) {
		nextFoodPoint = 'Full';
	} else {
		if (nursery.food.nextFoodPointPercentage) {
			nextFoodPoint = nursery.food.nextFoodPointPercentage.toFixed(1).toString() + '%';
		} else {
			nextFoodPoint = '0%';
		}
	}

	lines.push('```');
	lines.push(`${nursery.displayName}'s nursery [Greenleaf]`);
	lines.push(`Food Meter: ${nursery.food.foodPoints} (${nextFoodPoint})`);
	lines.push('');

	if (nursery.kits && nursery.kits.length > 0) {
		for (let i = 0; i < nursery.kits.length; i++) {
			const kitNumber = i + 1;
			const kit = nursery.kits[i];

			const kitPelt = pelt.stringifyPelt(kit.pelt);
			const kitEyes = eyes.stringifyEyes(kit.eyes);

			let gender = kit.gender?.toLowerCase() ?? 'kit';
			if (gender === '') gender = 'kit';

			lines.push(`[${kitNumber}] ${kit.fullName}: ${kitPelt} ${gender} with ${kitEyes}`);
		}
	} else {
		lines.push("You don't have any kits. Try /nursery breed to get some!");
	}

	lines.push('```');

	return lines.join('\n');
}

function nurseryMessageResponse(nursery: Nursery, messages: string[], showStatus?: boolean) {
	const nurseryView = showStatus ? buildNurseryStatusView(nursery) : buildNurseryHomeView(nursery);

	return messageResponse({
		content: messages.map((message) => `> ${message}`).join('\n') + '\n' + nurseryView,
	});
}

export { buildNurseryStatusView, buildNurseryHomeView, nurseryMessageResponse };
