import { messageResponse } from '#discord/responses.js';
import { getKitDescription, Kit } from './game/kit.js';

import type { Nursery } from './game/nursery-manager.js';

import * as config from '#config.js';

function stringifyKitDescription(kit: Kit, ansiColor?: boolean) {
	if (ansiColor) {
		return `\u001b[2;34m[${kit.position}]\u001b[0m \u001b[2;37m${kit.fullName}\u001b[0m: ${getKitDescription(kit)}`;
	}

	return `[${kit.position}] ${kit.fullName}: ${getKitDescription(kit)}`;
}

function stringifyKitStats(kit: Kit, ansiColor?: boolean) {
	const age = kit.age.toString().slice(0, 4);
	const health = (kit.health * 100).toFixed(1);
	const hunger = (kit.hunger * 100).toFixed(1);
	const bond = (kit.bond * 100).toFixed(1);
	const temperature = kit.temperatureClass;

	if (ansiColor) {
		return `- Age: ${age} moons | Health: ${health}% | Hunger: ${hunger}% | Bond: ${bond}% | Temp: ${temperature}`;
	}

	return `- Age: ${age} moons | Health: ${health}% | Hunger: ${hunger}% | Bond: ${bond}% | Temp: ${temperature}`;
}

function buildNurseryStatusView(nursery: Nursery, noAlerts?: boolean) {
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

	lines.push('```ansi');

	if (nursery.isPaused) {
		lines.push(
			`\u001b[1;2m${nursery.displayName}\u001b[0m's nursery \u001b[2;34m[${nursery.season}]\u001b[0m \u001b[2;31m[PAUSED]\u001b[0m`,
		);
	} else {
		lines.push(`\u001b[1;2m${nursery.displayName}\u001b[0m's nursery \u001b[2;34m[${nursery.season}]\u001b[0m`);
	}

	lines.push(`Food Meter: ${nursery.food.foodPoints} (${nextFoodPoint})`);
	lines.push('');

	if (!noAlerts) {
		if (nursery.alerts.length > 0) {
			const mostRecentAlerts = nursery.alerts.slice(undefined, config.NURSERY_SHORT_ALERTS);

			for (const alert of mostRecentAlerts) {
				lines.push(`| ${alert.alert}`);
			}

			if (nursery.alerts.length > config.NURSERY_SHORT_ALERTS) {
				lines.push(`| (use [alerts] to view the rest of your ${nursery.alerts.length} alerts)`);
			}
		} else {
			lines.push('You have no alerts.');
		}

		lines.push('');
	}

	if (nursery.kits && nursery.kits.length > 0) {
		for (let i = 0; i < nursery.kits.length; i++) {
			const kitNumber = i + 1;
			const kit = nursery.kits[i];

			if (kit.wanderingSince !== undefined) continue;

			lines.push(`\u001b[2;34m[${kitNumber}]\u001b[0m \u001b[2;37m${kit.fullName}\u001b[0m:`);
			lines.push(stringifyKitStats(kit, true));
		}
	} else {
		lines.push("You don't have any kits. Try /nursery breed to get some!");
	}

	if (nursery.kitsNeedingAttention.length > 0) {
		lines.push('');

		if (nursery.kitsNeedingAttention.length === 1) {
			lines.push(
				`\u001b[2;41m\u001b[2;37m[!] ${nursery.kitsNeedingAttention[0].fullName} needs your attention.\u001b[0m\u001b[2;41m\u001b[0m`,
			);
		} else if (nursery.kitsNeedingAttention.length === 2) {
			lines.push(
				`\u001b[2;41m\u001b[2;37m[!] ${nursery.kitsNeedingAttention[0].fullName} and ${nursery.kitsNeedingAttention[1].fullName} need your attention.\u001b[0m\u001b[2;41m\u001b[0m`,
			);
		} else {
			const namesNeedingAttention = nursery.kitsNeedingAttention.map((kit) => kit.fullName);
			const last = namesNeedingAttention.pop();

			lines.push(
				`\u001b[2;41m\u001b[2;37m[!] ${namesNeedingAttention.join(', ')}, and ${last} need your attention.\u001b[0m\u001b[2;41m\u001b[0m`,
			);
		}
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

	lines.push('```ansi');

	if (nursery.isPaused) {
		lines.push(
			`\u001b[1;2m${nursery.displayName}\u001b[0m's nursery \u001b[2;34m[${nursery.season}]\u001b[0m \u001b[2;31m[PAUSED]\u001b[0m`,
		);
	} else {
		lines.push(`\u001b[1;2m${nursery.displayName}\u001b[0m's nursery \u001b[2;34m[${nursery.season}]\u001b[0m`);
	}

	lines.push(`Food Meter: ${nursery.food.foodPoints} (${nextFoodPoint})`);
	lines.push('');

	if (nursery.kits && nursery.kits.length > 0) {
		for (let i = 0; i < nursery.kits.length; i++) {
			const kit = nursery.kits[i];

			lines.push(stringifyKitDescription(kit, true));
		}
	} else {
		lines.push("You don't have any kits. Try /nursery breed to get some!");
	}

	lines.push('```');

	return lines.join('\n');
}

function nurseryMessageResponse(nursery: Nursery, messages: string[], showStatus?: boolean, noAlerts?: boolean) {
	const nurseryView = showStatus ? buildNurseryStatusView(nursery, noAlerts) : buildNurseryHomeView(nursery);

	return messageResponse({
		content: messages.map((message) => `> ${message}`).join('\n') + '\n' + nurseryView,
	});
}

export {
	stringifyKitDescription,
	stringifyKitStats,
	buildNurseryStatusView,
	buildNurseryHomeView,
	nurseryMessageResponse,
};
