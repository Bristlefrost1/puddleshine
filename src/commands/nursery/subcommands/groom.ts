import * as DAPI from 'discord-api-types/v10';

import { deferMessage, editInteractionResponse } from '#discord/responses-deferred.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import { parseList } from '#utils/parse-list.js';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import { addNewEventToKit, KitEventType } from '#commands/nursery/game/kit-events.js';
import { getTemperatureClass } from '../game/kit.js';

import * as config from '#config.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'groom';

const GroomSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Groom your kits to make them warmer.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kits',
				description: 'The kits to groom by name or position ("all" to groom all of them at once)',
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
							messages: ["You don't have any kits to groom."],
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

				const groomMessages: string[] = [];
				const groomTime = new Date();

				const newKitTemperatures = kits.map((kit, index) => {
					if (kit.wanderingSince !== undefined) {
						groomMessages.push(`You can't see ${kit.fullName} anywhere.`);

						return;
					}

					let newTemperature: number;

					if (kit.temperature > 38) {
						newTemperature = kit.temperature - config.NURSERY_GROOM_TEMPERATURE;
					} else if (kit.temperature < 38) {
						newTemperature = kit.temperature + config.NURSERY_GROOM_TEMPERATURE;
					} else {
						newTemperature = kit.temperature;
					}

					nursery.kits[index].temperature = newTemperature;
					nursery.kits[index].temperatureClass = getTemperatureClass(newTemperature);

					groomMessages.push(`You've groomed ${kit.fullName}.`);
					addNewEventToKit(kit, KitEventType.Groom, '{{KIT_FULL_NAME}} was groomed.', groomTime);

					return { uuid: kit.uuid, newTemperature, events: JSON.stringify(kit.events) };
				});

				const newTemperatures = newKitTemperatures.filter((kit) => kit !== undefined);

				if (newTemperatures.length > 0)
					await nurseryDB.updateKitTemperatures(options.env.PRISMA, newTemperatures as any, groomTime);

				await editInteractionResponse(
					appId,
					discordToken,
					interactionToken,
					nurseryViews.nurseryMessageResponse(nursery, {
						view: 'status',
						messages: groomMessages,
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

export default GroomSubcommand;
