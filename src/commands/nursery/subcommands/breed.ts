import * as DAPI from 'discord-api-types/v10';

import { messageResponse } from '#discord/responses.js';

import * as db from '#db/database.js';

import { KitGender } from '#cat/gender.js';
import { Pelt, randomizePelt, stringifyPelt } from '#cat/pelts.js';
import { Eyes, randomizeEyes, stringifyEyes } from '#cat/eyes.js';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryStatus from '#commands/nursery/game/nursery-status.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';

import * as randomUtils from '#utils/random-utils.js';
import { generateRandomPrefix } from '#utils/clan-names.js';

import type { Subcommand } from '#commands/subcommand.js';
import type { WeightedValue } from '#utils/random-utils.js';

const SUBCOMMAND_NAME = 'breed';

const BreedSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Try to breed for kits.',

		options: [],
	},

	async execute(options) {
		const userId = options.user.id;

		const profile = await db.findProfileWithDiscordId(options.env.PRISMA, userId);
		const nursery = await nurseryDB.getNursery(options.env.PRISMA, userId);

		const genderOdds: WeightedValue<KitGender>[] = [
			{ value: KitGender.SheKit, probability: 0.5 },
			{ value: KitGender.TomKit, probability: '*' },
		];

		const gender = randomUtils.pickRandomWeighted(genderOdds);
		const prefix = generateRandomPrefix();
		const kitPelt = randomizePelt();
		const kitEyes = randomizeEyes();

		await nurseryDB.breedForKits(options.env.PRISMA, nursery.uuid, [
			{ prefix, gender, pelt: kitPelt, eyes: kitEyes },
		]);

		const kits = await nurseryDB.findKits(options.env.PRISMA, nursery.uuid);

		let displayName = options.user.username;
		if (profile && profile.name) displayName = profile.name;

		const foodMeter = nurseryStatus.getFood(nursery);

		return messageResponse({
			content:
				`> There was a litter of one kit: ${prefix}kit\n` +
				nurseryViews.buildNurseryHomeView({
					displayName,

					season: 'Greenleaf',

					foodPoints: foodMeter.foodPoints,
					nextFoodPointPercetage: foodMeter.nextFoodPointPercentage,

					kits: kits.map((kit) => {
						const name = kit.namePrefix + 'kit';
						const pelt = kit.pelt;
						const eyes = kit.eyes;
						const gender = kit.gender ?? undefined;

						return { name, pelt, eyes, gender };
					}),
				}),
		});
	},
};

export default BreedSubcommand;
