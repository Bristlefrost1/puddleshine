import * as DAPI from 'discord-api-types/v10';

import { messageResponse, simpleEphemeralResponse, simpleMessageResponse } from '#discord/responses.js';
import { parseCommandOptions } from '#discord/parse-options.js';

import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import { getKitDescription } from '../game/kit.js';
import { formatSeconds } from '#utils/date-time-utils.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'check';

const CheckSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Check up on a kit in detail.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kit',
				description: 'The kit whose details to show',
				required: true,
			},
		],
	},

	async execute(options) {
		const { kit: kitOption } = parseCommandOptions(options.commandOptions);

		if (!kitOption || kitOption.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No required kit option provided.');

		const nursery = await nurseryManager.getNursery(options.user, options.env);
		const foundKits = nurseryManager.locateKits(nursery, [kitOption.value.trim()]);

		if (foundKits.length === 0) {
			return simpleMessageResponse('No kits found with this input.');
		} else if (foundKits.length > 1) {
			return simpleMessageResponse(
				'The kit name entered refers to multiple kits. You can view the kits by position if you have two kits that share the same name.',
			);
		}

		const currentTimestamp = Math.floor(new Date().getTime() / 1000);
		const kit = foundKits[0];
		const lines: string[] = [];

		const age = kit.age.toFixed(2);
		const health = (kit.health * 100).toFixed(1);
		const hunger = (kit.hunger * 100).toFixed(1);
		const bond = (kit.bond * 100).toFixed(1);
		const temperature = kit.temperature.toFixed(1);

		let gender = kit.gender?.toLowerCase() ?? 'kit';
		if (gender === '') gender = 'kit';

		lines.push(`**__${kit.fullName}:__**`);
		lines.push(`> Age: ${age} moons`);
		lines.push(`> Health: ${health}%`);
		lines.push(`> Hunger: ${hunger}%`);
		lines.push(`> Bond: ${bond}%`);
		lines.push(
			`> Temperature: ${temperature}°C (${(kit.temperature * (9 / 5) + 32).toFixed(1)}°F) [${kit.temperatureClass}]`,
		);
		lines.push(`> Description: ${getKitDescription(kit, true)}`);

		lines.push('```');
		lines.push('Last 15 events (newest first):');
		kit.events.forEach((event) => {
			const secondsSince = currentTimestamp - event.timestamp;
			const formattedSeconds = formatSeconds(secondsSince);

			lines.push(`[${formattedSeconds}] ${event.description}`.replace('{{KIT_FULL_NAME}}', kit.fullName));
		});
		lines.push('```');

		return nurseryViews.nurseryMessageResponse(nursery, {
			view: 'status',
			messages: lines,
			preserveMessageFormatting: true,
		});
	},
};

export default CheckSubcommand;
