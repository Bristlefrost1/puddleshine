import * as DAPI from 'discord-api-types/v10'

import * as enums from '@/commands/catcha/catcha-enums'

export const commonSearchOptions: DAPI.APIApplicationCommandBasicOption[] = [
	{
		type: DAPI.ApplicationCommandOptionType.User,
		name: enums.ListSubcommandOption.User,
		description: 'The user to view the collection of',
		required: false,
	},
	{
		type: DAPI.ApplicationCommandOptionType.Integer,
		name: enums.ListSubcommandOption.Page,
		description: 'The page to view',
		required: false,
	},
	{
		type: DAPI.ApplicationCommandOptionType.Integer,
		name: enums.ListSubcommandOption.Rarity,
		description: 'Only show cards of this rarity',
		required: false,
		choices: [
			{ name: enums.RarityString.OneStar, value: 1 },
			{ name: enums.RarityString.TwoStars, value: 2 },
			{ name: enums.RarityString.ThreeStars, value: 3 },
			{ name: enums.RarityString.FourStars, value: 4 },
			{ name: enums.RarityString.FiveStars, value: 5 },
		],
	},
	{
		type: DAPI.ApplicationCommandOptionType.Boolean,
		name: enums.ListSubcommandOption.OnlyInverted,
		description: 'Only show inverted (flipped) cards',
		required: false,
	},
]
