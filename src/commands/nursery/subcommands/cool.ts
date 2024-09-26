import * as DAPI from 'discord-api-types/v10';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import { getTemperatureClass } from '#commands/nursery/game/kit.js';
import { formatSeconds } from '#utils/date-time-utils.js';

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

		if (nursery.isPaused)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ['Your nursery is currently paused.'],
			});

		if (nursery.kits.length < 1)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ["You don't have any kits to cool."],
			});

		if (nursery.lastCooledAt) {
			const currentTimestamp = Math.floor(new Date().getTime() / 1000);
			const lastCooledAtTimestamp = Math.floor(nursery.lastCooledAt.getTime() / 1000);
			const secondsSinceLastCool = currentTimestamp - lastCooledAtTimestamp;

			if (secondsSinceLastCool < config.NURSERY_COOL_COOLDOWN) {
				const canCoolIn = lastCooledAtTimestamp + config.NURSERY_COOL_COOLDOWN - currentTimestamp;

				return nurseryViews.nurseryMessageResponse(nursery, {
					view: 'status',
					messages: [`You've recently cooled your nursery (${formatSeconds(canCoolIn)})`],
				});
			}
		}

		const newKitTemperatures = nursery.kits.map((kit, index) => {
			if (kit.wanderingSince !== undefined) return;

			const newTemperature = kit.temperature - config.NURSERY_COOL_TEMPERATURE;

			nursery.kits[index].temperature = newTemperature;
			nursery.kits[index].temperatureClass = getTemperatureClass(newTemperature);

			return { uuid: kit.uuid, newTemperature };
		});

		await nurseryDB.coolNursery(
			options.env.PRISMA,
			nursery.uuid,
			newKitTemperatures.filter((kit) => kit !== undefined) as any,
		);

		return nurseryViews.nurseryMessageResponse(nursery, {
			view: 'status',
			messages: ["You've cooled the nursery."],
		});
	},
};

export default CoolSubcommand;
