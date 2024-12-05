import * as DAPI from 'discord-api-types/v10';

import { deferMessage, editInteractionResponse } from '#discord/responses-deferred.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import { parseList } from '#utils/parse-list.js';
import { getPronouns } from '#cat/gender.js';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import { addNewEventToKit, KitEventType } from '#commands/nursery/game/kit-events.js';

import * as config from '#config.js';

import type { Subcommand } from '#commands/subcommand.js';
import type { Kit } from '#commands/nursery/game/kit.js';

const SUBCOMMAND_NAME = 'medicine';

const MedicineSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: "Take kits to the medicine den if they're sick.",

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kits',
				description: 'The kits to take to see the medicine cat ("all" to take all of them)',
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
							messages: ["You don't have any kits to take to the medicine den."],
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

				const messages: string[] = [];
				const treatKits: Kit[] = [];

				for (const kit of kits) {
					const pronouns = getPronouns(kit.gender);

					if (kit.sickSince === undefined) {
						messages.push(
							`${kit.fullName} is feeling well and doesn't need to be taken to the medicine den.`,
						);
						continue;
					}

					if (kit.wanderingSince !== undefined) {
						messages.push(`You can't see ${kit.fullName} anywhere to take them to the medicine den.`);
						continue;
					}

					kit.sickSince = undefined;
					kit.bond -= config.NURSERY_MEDICINE_BOND_DECREASE;
					if (kit.bond < 0) kit.bond = 0;

					addNewEventToKit(
						kit,
						KitEventType.Medicine,
						'{{KIT_FULL_NAME}} was treated for sickness in the medicine den.',
					);

					treatKits.push(kit);
					messages.push(
						`You took ${kit.fullName} to see the medicine cat, who immediately treated ${pronouns.object} for sickness.`,
					);

					nursery.kits[kit.index] = kit;
					nursery.kitsNeedingAttention = nursery.kitsNeedingAttention.filter(
						(kitNeedingAttention) => kitNeedingAttention.uuid !== kit.uuid,
					);
				}

				if (treatKits.length > 0) await nurseryDB.setKitsSickSince(options.env.PRISMA, treatKits, null);

				await editInteractionResponse(
					appId,
					discordToken,
					interactionToken,
					nurseryViews.nurseryMessageResponse(nursery, {
						view: 'status',
						messages: messages,
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

export default MedicineSubcommand;
