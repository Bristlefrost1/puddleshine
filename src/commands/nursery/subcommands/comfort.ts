import * as DAPI from 'discord-api-types/v10';

import { simpleEphemeralResponse } from '#discord/responses.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import { parseList } from '#utils/parse-list.js';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import { addNewEventToKit, KitEventType } from '#commands/nursery/game/kit-events.js';
import { getTemperatureClass } from '../game/kit.js';

import * as config from '#config.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'comfort';

const ComfortSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Comfort your kits to make them warmer.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kits',
				description: 'The kits to comfort by name or position ("all" to comfort all of them at once)',
				required: true,
			},
		],
	},

	async execute(options) {
		const { kits: kitsOption } = parseCommandOptions(options.commandOptions);

		if (!kitsOption || kitsOption.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No kits option provided.');

		const kitNames = parseList(kitsOption.value) as string[];
		const nursery = await nurseryManager.getNursery(options.user, options.env);

		if (nursery.kits.length < 1)
			return nurseryViews.nurseryMessageResponse(nursery, ["You don't have any kits to comfort."], true);

		const kits = nurseryManager.locateKits(nursery, kitNames);

		if (kits.length < 1)
			return nurseryViews.nurseryMessageResponse(nursery, ["Couldn't find kits with the provided input."], true);

		const comfortMessages: string[] = [];
		const comfortTime = new Date();

		const newKitTemperatures = kits.map((kit, index) => {
			const newTemperature = kit.temperature + config.NURSERY_COMFORT_TEMPERATURE;

			nursery.kits[index].temperature = newTemperature;
			nursery.kits[index].temperatureClass = getTemperatureClass(newTemperature);

			comfortMessages.push(`You've comforted ${kit.fullName}.`);
			addNewEventToKit(kit, KitEventType.Comfort, '{{KIT_FULL_NAME}} was comforted.', comfortTime);

			return { uuid: kit.uuid, newTemperature, events: JSON.stringify(kit.events) };
		});

		await nurseryDB.updateKitTemperatures(options.env.PRISMA, newKitTemperatures, comfortTime);

		return nurseryViews.nurseryMessageResponse(nursery, comfortMessages, true);
	},
};

export default ComfortSubcommand;
