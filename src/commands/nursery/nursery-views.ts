
import * as listMessage from '@/discord/list-message'
import { messageResponse } from '@/discord/responses'
import { type Nursery } from './game/nursery-manager'
import { getKitDescription, Kit } from './game/kit'

import * as config from '@/config'

function stringifyKitDescription(kit: Kit, ansiColour?: boolean) {
	if (ansiColour) {
		return `\u001b[2;34m[${kit.position}]\u001b[0m \u001b[2;37m${kit.fullName}\u001b[0m: ${getKitDescription(kit)}`
	}

	return `[${kit.position}] ${kit.fullName}: ${getKitDescription(kit)}`
}

function stringifyKitStatus(kit: Kit, ansiColour?: boolean) {
	const age = kit.age.toString().slice(0, 4)
	const health = (kit.health * 100).toFixed(1)
	const hunger = (kit.hunger * 100).toFixed(1)
	const bond = (kit.bond * 100).toFixed(1)
	const temperature = kit.temperatureClass

	if (ansiColour) {
		return `- Age: ${age} moons | Health: ${health}% | Hunger: ${hunger}% | Bond: ${bond}% | Temp: ${temperature}`
	}

	return `- Age: ${age} moons | Health: ${health}% | Hunger: ${hunger}% | Bond: ${bond}% | Temp: ${temperature}`
}

function stringifyNurseryStatus(nursery: Nursery, noAlerts?: boolean) {
	const lines: string[] = []

	let nextFoodPoint = ''

	if (nursery.food.foodPoints >= nursery.food.max) {
		nextFoodPoint = 'Full'
	} else {
		if (nursery.food.nextFoodPointPercentage) {
			nextFoodPoint = nursery.food.nextFoodPointPercentage.toFixed(1).toString() + '%'
		} else {
			nextFoodPoint = '0%'
		}
	}

	if (nursery.isPaused) {
		lines.push(
			`\u001b[1;2m${nursery.displayName}\u001b[0m's nursery \u001b[2;34m[${nursery.season}]\u001b[0m \u001b[2;31m[PAUSED]\u001b[0m`,
		)
	} else {
		lines.push(`\u001b[1;2m${nursery.displayName}\u001b[0m's nursery \u001b[2;34m[${nursery.season}]\u001b[0m`)
	}

	lines.push(`Food Meter: ${nursery.food.foodPoints} (${nextFoodPoint})`)

	if (!noAlerts) {
		lines.push('');

		if (nursery.alerts.length > 0) {
			const mostRecentAlerts = nursery.alerts.slice(undefined, config.NURSERY_SHORT_ALERTS)

			for (const alert of mostRecentAlerts) {
				lines.push(`| ${alert.alert}`)
			}

			if (nursery.alerts.length > config.NURSERY_SHORT_ALERTS) {
				lines.push(`| (use [alerts] to view the rest of your ${nursery.alerts.length} alerts)`)
			}
		} else {
			lines.push('You have no alerts.')
		}
	}

	return lines.join('\n')
}

function buildKitList(nursery: Nursery, view: 'status' | 'home') {
	const list: string[] = []

	if (nursery.kits.length === 0) {
		list.push("You don't have any kits. Try /nursery breed to get some!")
		return list
	}

	for (let i = 0; i < nursery.kits.length; i++) {
		const kitNumber = i + 1
		const kit = nursery.kits[i]

		if (kit.wanderingSince !== undefined) continue

		if (view === 'status') {
			list.push(
				`\u001b[2;34m[${kitNumber}]\u001b[0m \u001b[2;37m${kit.fullName}\u001b[0m:\n${stringifyKitStatus(kit, true)}`,
			)
		} else {
			list.push(stringifyKitDescription(kit, true))
		}
	}

	return list
}

function stringifyNurseryFooter(nursery: Nursery) {
	if (nursery.kitsNeedingAttention.length > 0) {
		if (nursery.kitsNeedingAttention.length === 1) {
			return `\n\u001b[2;41m\u001b[2;37m[!] ${nursery.kitsNeedingAttention[0].fullName} needs your attention.\u001b[0m\u001b[2;41m\u001b[0m`
		} else if (nursery.kitsNeedingAttention.length === 2) {
			return `\n\u001b[2;41m\u001b[2;37m[!] ${nursery.kitsNeedingAttention[0].fullName} and ${nursery.kitsNeedingAttention[1].fullName} need your attention.\u001b[0m\u001b[2;41m\u001b[0m`
		} else {
			const namesNeedingAttention = nursery.kitsNeedingAttention.map((kit) => kit.fullName)
			const last = namesNeedingAttention.pop()

			return `\n\u001b[2;41m\u001b[2;37m[!] ${namesNeedingAttention.join(', ')}, and ${last} need your attention.\u001b[0m\u001b[2;41m\u001b[0m`
		}
	}

	return ''
}

function nurseryMessageResponse(
	nursery: Nursery,
	options: {
		view: 'status' | 'home';
		messages?: string[];
		preserveMessageFormatting?: boolean;
		noAlerts?: boolean;
		scroll?: boolean;
		scrollPageData?: string;
	},
) {
	let messages = ''

	if (options.messages && options.messages.length > 0) {
		// prettier-ignore
		messages = options.messages.map((message) => options.preserveMessageFormatting ? message : `> ${message}`).join('\n')
	}

	if (!messages.endsWith('\n')) messages += '\n'

	const nurseryStatus = stringifyNurseryStatus(nursery, options.noAlerts)
	const kitList = buildKitList(nursery, options.view)
	const nurseryFooter = stringifyNurseryFooter(nursery)

	let list

	if (!options.scroll) {
		list = listMessage.createListMessage({
			action: `nursery/${options.view}`,
			listDataString: nursery.discordId,

			description: messages + '```ansi\n' + nurseryStatus + '\n\n',
			items: kitList,

			noEmbed: true,
			noEmbedFooter: nurseryFooter + '```',
		})
	} else {
		list = listMessage.scrollListMessage({
			action: `nursery/${options.view}`,
			pageData: options.scrollPageData!,
			listDataString: nursery.discordId,

			description: messages + '```ansi\n' + nurseryStatus + '\n\n',
			items: kitList,

			noEmbed: true,
			noEmbedFooter: nurseryFooter + '```',
		})
	}

	return messageResponse({
		content: list.content,
		components: list.scrollActionRow ? [list.scrollActionRow] : undefined,
		update: options.scroll,
	})
}

export { stringifyKitDescription, stringifyKitStatus, stringifyNurseryStatus, nurseryMessageResponse };
