import * as DAPI from 'discord-api-types/v10';

import { KitGender } from '#cat/gender.js';
import { randomizePelt } from '#cat/pelts.js';
import { randomizeEyes } from '#cat/eyes.js';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
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
		let nursery = await nurseryManager.getNursery(options.user, options.env);

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

		// Refresh the nursery
		nursery = await nurseryManager.getNursery(options.user, options.env);

		return nurseryViews.nurseryMessageResponse(nursery, [`There was a litter of one kit: ${prefix}kit`]);
	},
};

export default BreedSubcommand;
