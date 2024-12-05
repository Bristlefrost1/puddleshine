import * as DAPI from 'discord-api-types/v10';

import { deferMessage, editInteractionResponse } from '#discord/responses-deferred.js';
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
		const deferredExecute = async () => {
			try {
				const appId = options.env.DISCORD_APPLICATION_ID;
				const discordToken = options.env.DISCORD_TOKEN;
				const interactionToken = options.interaction.token;

				const { kits: kitsOption } = parseCommandOptions(options.commandOptions);

				if (!kitsOption || kitsOption.type !== DAPI.ApplicationCommandOptionType.String) return;

				const kitNames = parseList(kitsOption.value) as string[];
				const nursery = await nurseryManager.getNursery(options.user, options.env);

				if (nursery.isPaused) {
					await editInteractionResponse(
						appId,
						discordToken,
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: ['Your nursery is currently paused.'],
						}).data!,
					);

					return;
				}

				if (nursery.kits.length < 1) {
					await editInteractionResponse(
						appId,
						discordToken,
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: ["You don't have any kits to comfort."],
						}).data!,
					);

					return;
				}

				const kits = nurseryManager.locateKits(nursery, kitNames);

				if (kits.length < 1) {
					await editInteractionResponse(
						appId,
						discordToken,
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'status',
							messages: ["Couldn't find kits with the provided input."],
						}).data!,
					);

					return;
				}

				const comfortMessages: string[] = [];
				const comfortTime = new Date();

				const newKitTemperatures = kits.map((kit, index) => {
					if (kit.wanderingSince !== undefined) {
						comfortMessages.push(`You can't see ${kit.fullName} anywhere.`);

						return;
					}

					const newTemperature = kit.temperature + config.NURSERY_COMFORT_TEMPERATURE;

					nursery.kits[index].temperature = newTemperature;
					nursery.kits[index].temperatureClass = getTemperatureClass(newTemperature);

					comfortMessages.push(`You've comforted ${kit.fullName}.`);
					addNewEventToKit(kit, KitEventType.Comfort, '{{KIT_FULL_NAME}} was comforted.', comfortTime);

					return { uuid: kit.uuid, newTemperature, events: JSON.stringify(kit.events) };
				});

				const newTemperatures = newKitTemperatures.filter((kit) => kit !== undefined);

				if (newTemperatures.length > 0)
					await nurseryDB.updateKitTemperatures(options.env.PRISMA, newTemperatures as any, comfortTime);

				await editInteractionResponse(
					appId,
					discordToken,
					interactionToken,
					nurseryViews.nurseryMessageResponse(nursery, {
						view: 'status',
						messages: comfortMessages,
					}).data!,
				);
			} catch (error) {
				console.error(error);
			}
		};

		options.ctx.waitUntil(deferredExecute());

		return deferMessage();
	},
};

export default ComfortSubcommand;
