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
import type { Pelt } from '#cat/pelts.js';
import type { Eyes } from '#cat/eyes.js';

import * as config from '#config.js';

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

		if (nursery.isPaused) {
			return nurseryViews.nurseryMessageResponse(nursery, ['Your nursery is currently paused.']);
		}

		const breedTime = new Date();
		const breedTimestamp = Math.floor(breedTime.getTime() / 1000);

		if (nursery.lastBredAt) {
			const lastBreedTimestamp = Math.floor(nursery.lastBredAt.getTime() / 1000);
			const canBreedAt = lastBreedTimestamp + config.NURSERY_BREED_COOLDOWN;

			if (canBreedAt > breedTimestamp && options.env.ENV !== 'dev') {
				return nurseryViews.nurseryMessageResponse(nursery, [
					`You can next breed on <t:${canBreedAt}:F> (<t:${canBreedAt}:R>).`,
				]);
			}
		}

		let numberOfKits = 1;

		if (nursery.kits.length > 1) {
			const noKitsOdds: WeightedValue<boolean>[] = [
				{ value: true, probability: config.NURSERY_NO_KITS_BREED_CHANCE },
				{ value: false, probability: '*' },
			];

			if (randomUtils.pickRandomWeighted(noKitsOdds)) numberOfKits = 0;
		}

		if (numberOfKits === 0) return nurseryViews.nurseryMessageResponse(nursery, ['There were no kits this time.']);

		const numberOfKitsOdds: WeightedValue<number>[] = [
			{ value: 1, probability: config.NURSERY_1_KIT_CHANCE },
			{ value: 2, probability: config.NURSERY_2_KITS_CHANCE },
			{ value: 3, probability: config.NURSERY_3_KITS_CHANCE },
			{ value: 4, probability: config.NURSERY_4_KITS_CHANCE },
		];

		numberOfKits = randomUtils.pickRandomWeighted(numberOfKitsOdds);

		const bredKits: {
			prefix: string;
			gender: KitGender;
			pelt: Pelt;
			eyes: Eyes;
		}[] = [];

		const kitNames: string[] = [];

		for (let i = 0; i < numberOfKits; i++) {
			const genderOdds: WeightedValue<KitGender>[] = [
				{ value: KitGender.SheKit, probability: 0.5 },
				{ value: KitGender.TomKit, probability: '*' },
			];

			const gender = randomUtils.pickRandomWeighted(genderOdds);
			const prefix = generateRandomPrefix();
			const kitPelt = randomizePelt();
			const kitEyes = randomizeEyes();

			kitNames.push(`${prefix}kit`);
			bredKits.push({ prefix, gender, pelt: kitPelt, eyes: kitEyes });
		}

		await nurseryDB.breedForKits(options.env.PRISMA, nursery.uuid, breedTime, bredKits);

		let kitsString = '';

		if (kitNames.length === 1) {
			kitsString = kitNames[0];
		} else if (kitNames.length === 2) {
			kitsString = `${kitNames[0]} and ${kitNames[1]}`;
		} else if (kitNames.length >= 3) {
			const last = kitNames.pop();

			kitsString = kitNames.join(', ');
			kitsString += `, and ${last}`;
		}

		let numberString = '';

		switch (numberOfKits) {
			case 1:
				numberString = 'one kit';
				break;

			case 2:
				numberString = 'two kits';
				break;

			case 3:
				numberString = 'three kits';
				break;

			case 4:
				numberString = 'four kits';
				break;

			default:
				numberString = numberOfKits.toString();
		}

		// Refresh the nursery
		nursery = await nurseryManager.getNursery(options.user, options.env);

		return nurseryViews.nurseryMessageResponse(nursery, [`There was a litter of ${numberString}: ${kitsString}`]);
	},
};

export default BreedSubcommand;
