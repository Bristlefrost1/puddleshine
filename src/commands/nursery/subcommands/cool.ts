import * as DAPI from 'discord-api-types/v10';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import { getTemperatureClass } from '../game/kit.js';

import * as config from '#config.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'cool';

const CoolSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Cool your kits.',

		options: [],
	},

	async execute(options) {
		const nursery = await nurseryManager.getNursery(options.user, options.env);

		if (nursery.kits.length === 0) {
			return nurseryViews.nurseryMessageResponse(nursery, ["You don't have any kits to cool."], true);
		}

		const newKitTemperatures = nursery.kits.map((kit, index) => {
			const newTemperature = kit.temperature - config.NURSERY_COOL_TEMPERATURE;

			nursery.kits[index].temperature = newTemperature;
			nursery.kits[index].temperatureClass = getTemperatureClass(newTemperature);

			return { uuid: kit.uuid, newTemperature };
		});

		await nurseryDB.coolNursery(options.env.PRISMA, nursery.uuid, newKitTemperatures);

		return nurseryViews.nurseryMessageResponse(nursery, ["You've cooled the nursery."], true);
	},
};

export default CoolSubcommand;
