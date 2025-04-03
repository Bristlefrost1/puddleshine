import * as DAPI from 'discord-api-types/v10'

import { messageResponse } from '@/discord/responses'

import * as nurseryManager from '@/commands/nursery/game/nursery-manager'
import * as nurseryViews from '@/commands/nursery/nursery-views'

import { type Subcommand } from '@/commands'

const SUBCOMMAND_NAME = 'status'

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'See the status of your nursery and kits.',

		options: [],
	},

	async onApplicationCommand(options) {
		const nursery = await nurseryManager.getNursery(options.user, true)

		return nurseryViews.nurseryMessageResponse(nursery, { view: 'status' })
	},
} as Subcommand
