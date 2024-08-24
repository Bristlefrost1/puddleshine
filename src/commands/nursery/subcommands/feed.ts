import * as DAPI from 'discord-api-types/v10';

import { simpleEphemeralResponse } from '#discord/responses.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import { parseList } from '#utils/parse-list.js';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import { addNewEventToKit, KitEventType } from '#commands/nursery/game/kit-events.js';

import * as config from '#config.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'feed';

const FeedSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Feed your kits.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kits',
				description: 'The kits to feed by name or position ("all" to feed all of them at once)',
				required: true,
			},
		],
	},

	async execute(options) {
		const { kits: kitsOption } = parseCommandOptions(options.commandOptions);

		if (!kitsOption || kitsOption.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No kits option provided.');

		const kitNamesToFeed = parseList(kitsOption.value) as string[];

		const nursery = await nurseryManager.getNursery(options.user, options.env);

		if (nursery.kits.length < 1)
			return nurseryViews.nurseryMessageResponse(nursery, ["You don't have any kits to feed."], true);

		const kitsToFeed = nurseryManager.locateKits(nursery, kitNamesToFeed);

		if (kitsToFeed.length < 1)
			return nurseryViews.nurseryMessageResponse(nursery, ["Couldn't find kits with the provided input."], true);

		const foodPointsNeeded = kitsToFeed.length * config.NURSERY_FEED_FOOD_POINTS;

		if (foodPointsNeeded > nursery.food.foodPoints)
			return nurseryViews.nurseryMessageResponse(nursery, ["You don't have enough food to feed the kits."], true);

		const feedMessages: string[] = [];
		const feedTime = new Date();

		nursery.food.foodPoints -= foodPointsNeeded;
		nursery.food.food -= foodPointsNeeded;

		const dbUpdate = kitsToFeed.map((kit) => {
			let hunger = kit.hunger + config.NURSERY_FEED_HUNGER_REGEN;
			if (hunger > 1) hunger = 1;

			nursery.kits[kit.index].hunger = hunger;
			feedMessages.push(`You've fed ${kit.fullName}.`);

			addNewEventToKit(kit, KitEventType.Feed, '{{KIT_FULL_NAME}} was fed.');

			return { uuid: kit.uuid, hunger, events: JSON.stringify(kit.events) };
		});

		await nurseryDB.feedKits(options.env.PRISMA, nursery.uuid, feedTime, nursery.food.food, dbUpdate);

		return nurseryViews.nurseryMessageResponse(nursery, feedMessages, true);
	},
};

export default FeedSubcommand;
