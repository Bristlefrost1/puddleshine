import * as DAPI from 'discord-api-types/v10';

import { deferMessage, editInteractionResponse } from '#discord/responses-deferred.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import * as nurseryDB from '#commands/nursery/db/nursery-db.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'pause';

const PauseSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: "Pause your nursery if you can't look after your kits for a while.",

		options: [],
	},

	async execute(options) {
		const deferredExecute = async () => {
			try {
				const appId = options.env.DISCORD_APPLICATION_ID;
				const discordToken = options.env.DISCORD_TOKEN;
				const interactionToken = options.interaction.token;

				const nursery = await nurseryManager.getNursery(options.user, options.env);

				if (nursery.isPaused) {
					await nurseryDB.unpauseNursery(options.env.PRISMA, nursery, nursery.kits);

					nursery.isPaused = false;

					await editInteractionResponse(
						appId,
						discordToken,
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: ["You've returned to take care of your kits."],
						}).data!,
					);
				} else {
					await nurseryDB.pauseNursery(options.env.PRISMA, nursery, nursery.kits);

					nursery.isPaused = true;

					await editInteractionResponse(
						appId,
						discordToken,
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: [
								"You let the other cats in the nursery to take care of your kits while you're gone.",
								'Do [pause] again to resume.',
							],
						}).data!,
					);
				}
			} catch (error) {
				console.log(error);
			}
		};

		options.ctx.waitUntil(deferredExecute());

		return deferMessage();
	},
};

export default PauseSubcommand;
