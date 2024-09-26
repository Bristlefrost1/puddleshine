import * as DAPI from 'discord-api-types/v10';

import { simpleEphemeralResponse } from '#discord/responses.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import { parseList } from '#utils/parse-list.js';
import { pickRandomWeighted, WeightedValue } from '#utils/random-utils.js';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import { addNewEventToKit, KitEventType } from '#commands/nursery/game/kit-events.js';

import type { Subcommand } from '#commands/subcommand.js';
import type { Kit } from '#commands/nursery/game/kit.js';

import * as config from '#config.js';

const kitFoundMessages: WeightedValue<string>[] = [
	{
		value: 'You found {{KIT_FULL_NAME}} wandering outside the camp. You scold your kit not to wander off.',
		probability: '*',
	},
	{
		value: "Thank StarClan! {{KIT_FULL_NAME}} was only in the elders' den listening to their stories.",
		probability: '*',
	},
	{
		value: '{{KIT_FULL_NAME}} was still in the nursery after all but out of sight.',
		probability: '*',
	},
];

const SUBCOMMAND_NAME = 'find';

const FindSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Find missing kits.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kits',
				description: 'The kits to look for ("all" to look for all of them)',
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

		if (nursery.isPaused)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ['Your nursery is currently paused.'],
			});

		if (nursery.kits.length < 1)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ["You don't have any kits to search for."],
			});

		const kits = nurseryManager.locateKits(nursery, kitNames);

		if (kits.length < 1)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'home',
				messages: ["Couldn't find kits with the provided input."],
			});

		const messages: string[] = [];
		const foundKits: Kit[] = [];

		for (const kit of kits) {
			if (kit.wanderingSince === undefined) {
				messages.push(`${kit.fullName} is thankfully safe with you in the nursery.`);
				continue;
			}

			const kitFoundOdds: WeightedValue<boolean>[] = [
				{ value: true, probability: 0.8 },
				{ value: false, probability: '*' },
			];
			const kitFound = pickRandomWeighted(kitFoundOdds);

			if (!kitFound) {
				messages.push(`Despite looking hard, you can't find ${kit.fullName} anywhere.`);
				continue;
			}

			kit.wanderingSince = undefined;
			kit.bond -= config.NURSERY_WANDER_BOND_DECREASE;
			if (kit.bond < 0) kit.bond = 0;

			addNewEventToKit(kit, KitEventType.Found, '{{KIT_FULL_NAME}} was found after having gone wandering.');

			foundKits.push(kit);
			messages.push(pickRandomWeighted(kitFoundMessages).replaceAll('{{KIT_FULL_NAME}}', kit.fullName));

			nursery.kits[kit.index] = kit;
		}

		if (foundKits.length < 1)
			return nurseryViews.nurseryMessageResponse(nursery, {
				view: 'status',
				messages: messages,
			});

		await nurseryDB.setKitsWanderingSince(options.env.PRISMA, foundKits, null);

		return nurseryViews.nurseryMessageResponse(nursery, {
			view: 'status',
			messages: messages,
		});
	},
};

export default FindSubcommand;
