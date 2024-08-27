import * as DAPI from 'discord-api-types/v10';

import { simpleEphemeralResponse } from '#discord/responses.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import { parseList } from '#utils/parse-list.js';
import { getPronouns } from '#cat/gender.js';
import { ClanRank } from '#utils/clans.js';
import * as randomUtils from '#utils/random-utils.js';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';

import type { Subcommand } from '#commands/subcommand.js';
import type { WeightedValue } from '#utils/random-utils.js';

import * as config from '#config.js';

const SUBCOMMAND_NAME = 'promote';

const PromoteSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: `Promote a kit when it has reached the age of ${config.NURSERY_PROMOTE_AGE} moons.`,

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kit',
				description: 'The kit to promote by name or position',
				required: true,
			},
		],
	},

	async execute(options) {
		const nursery = await nurseryManager.getNursery(options.user, options.env);

		const { kit: kitOption } = parseCommandOptions(options.commandOptions);

		if (!kitOption || kitOption.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No kit option provided.');

		const kitNames = parseList(kitOption.value) as string[];
		const foundKits = nurseryManager.locateKits(nursery, kitNames);

		if (foundKits.length < 1)
			// prettier-ignore
			return nurseryViews.nurseryMessageResponse(nursery, ["Couldn't find a kit with the provided input."], false);

		const kit = foundKits[0];

		if (kit.age < config.NURSERY_PROMOTE_AGE)
			// prettier-ignore
			return nurseryViews.nurseryMessageResponse(nursery, [`${kit.fullName} hasn't reached the age of ${config.NURSERY_PROMOTE_AGE} moons yet.`], false);

		// Alright, the kit is old enough, promotion time
		const rankOdds: WeightedValue<ClanRank.MedicineCatApprentice | ClanRank.WarriorApprentice>[] = [
			{ value: ClanRank.MedicineCatApprentice, probability: 0.2 },
			{ value: ClanRank.WarriorApprentice, probability: '*' },
		];

		const clan = nursery.clan ?? '';
		const apprenticeRank = randomUtils.pickRandomWeighted(rankOdds);

		const pronouns = getPronouns(kit.gender);
		const apprenticeName = kit.prefix + 'paw';

		await nurseryDB.promoteKit(options.env.PRISMA, nursery.uuid, kit, { clan, apprenticeRank });

		nursery.kits = nursery.kits.filter((nurseryKit) => nurseryKit.position !== kit.position);
		nursery.kits = nursery.kits.map((nurseryKit, index) => {
			const kitData = nurseryKit;

			kitData.index = index;
			kitData.position = index + 1;

			return kitData;
		});

		let promotionMessage: string[] = [];

		if (apprenticeRank === ClanRank.MedicineCatApprentice) {
			promotionMessage = [
				`It has become time for ${kit.fullName}'s apprentice ceremony. However, ${pronouns.subject} says ${pronouns.subject} would like to become a medicine cat instead of a warrior. You agree, having noticed your kits connection to StarClan from a young age.`,
				'\n',
				`You follow ${kit.fullName} out of the den to the medicine den where the Clan's medicine cat takes ${pronouns.object} as their apprentice. The leader calls a Clan meeting and ${kit.fullName} is assigned to the Clan's medicine cat. Soon, it's time for ${apprenticeName}'s first half-moon meeting where ${pronouns.subject} is presented to StarClan as a medicine cat apprentice.`,
				'\n',
				`"${apprenticeName}! ${apprenticeName}! ${apprenticeName}!"`,
			];
		} else {
			promotionMessage = [
				`It has become time for ${kit.fullName}'s apprentice ceremony. You tell ${pronouns.object} about it and ${pronouns.subject} dashes out of the den with glowing eyes and in excitement.`,
				'\n',
				`You follow ${kit.fullName} out of the den to the Clan leader's yowls to gather for a Clan meeting. You watch as the leader calls ${pronouns.object} over and assigns ${pronouns.object} to a worthy mentor.`,
				'\n',
				`"${apprenticeName}! ${apprenticeName}! ${apprenticeName}!"`,
			];
		}

		return nurseryViews.nurseryMessageResponse(nursery, promotionMessage, false);
	},
};

export default PromoteSubcommand;
