import * as DAPI from 'discord-api-types/v10';

import * as roll from './roll/roll.js';
import * as claim from './roll/claim.js';
import * as list from './collection/subcommands/list.js';
import * as duplicates from './collection/subcommands/duplicates.js';
import * as locate from './collection/subcommands/locate.js';
import * as remaining from './collection/subcommands/remaining.js';
import * as view from './collection/subcommands/view.js';
import * as archiveSubcommand from './archive/archive-subcommand.js';
import * as tradeInteractions from './trade/trade-interactions.js';
import * as statsSubcommand from './stats/stats-subcommand.js';
import * as eventSubcommand from './event/event-subcommand.js';
import * as burn from './collection/subcommands/burn.js';
import { onArtScroll } from './art/art-scroll.js';
import * as enums from './catcha-enums.js';
import { getAutocompleteChoices } from './archive/autocomplete-card.js';

import type { Command } from '../command.js';

/**
 * The command options that are common to all of the collection-related
 * subcommands such as locate, list, duplicates, and so on. Used for
 * filtering the results by rarity, inverted, user, etc.
 */
const commonSearchOptions: DAPI.APIApplicationCommandBasicOption[] = [
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
];

/**
 * The Catcha command object. Contains all of the handlers for the Catcha
 * command as well as the Catcha command data.
 */
const CatchaCommand: Command = {
	name: 'catcha',

	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'catcha',
		description: 'A Warriors card collection game.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall, DAPI.ApplicationIntegrationType.UserInstall],
		contexts: [
			DAPI.InteractionContextType.Guild,
			DAPI.InteractionContextType.BotDM,
			DAPI.InteractionContextType.PrivateChannel,
		],

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: enums.Subcommand.Roll,
				description: 'Roll a new card.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.Integer,
						name: 'cached',
						description: "The number of the roll to send from the bot's cache",
						required: false,
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: enums.Subcommand.List,
				description: "View your or another user's collection.",

				options: [
					...commonSearchOptions,
					{
						type: DAPI.ApplicationCommandOptionType.Boolean,
						name: enums.ListSubcommandOption.OnlyVariant,
						description: 'Only show variant cards',
						required: false,
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: enums.Subcommand.Locate,
				description: 'Search for a specific card from a collection.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.String,
						name: enums.LocateSubcommandOption.Card,
						description: 'The card to search for (name or card ID)',
						required: true,
						autocomplete: true,
					},
					...commonSearchOptions,
					{
						type: DAPI.ApplicationCommandOptionType.Boolean,
						name: enums.ListSubcommandOption.OnlyVariant,
						description: 'Only show variant cards',
						required: false,
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: enums.Subcommand.Duplicates,
				description: "List your or another user's duplicate cards.",

				options: [
					...commonSearchOptions,
					{
						type: DAPI.ApplicationCommandOptionType.Boolean,
						name: enums.ListSubcommandOption.OnlyVariant,
						description: 'Only show variant cards',
						required: false,
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: enums.Subcommand.Remaining,
				description: "List your or another user's remaining cards.",

				options: [...commonSearchOptions],
			},
			{
				type: DAPI.ApplicationCommandOptionType.SubcommandGroup,
				name: enums.Subcommand.Trade,
				description: 'Trade cards with another user.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: enums.Subcommand.TradeRequest,
						description: 'Send a trade request to another user.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: "The user you'd like to trade with",
								required: true,
							},
							{
								type: DAPI.ApplicationCommandOptionType.String,
								name: 'cards',
								description:
									'The cards in your collection by position to give the user, separated by commas',
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: enums.Subcommand.TradeCancel,
						description: 'Cancel a trade request.',

						options: [
							{
								type: DAPI.ApplicationCommandOptionType.User,
								name: 'user',
								description: "The user you've sent a trade request",
								required: true,
							},
						],
					},
					{
						type: DAPI.ApplicationCommandOptionType.Subcommand,
						name: enums.Subcommand.TradeClear,
						description: 'Clear all of your pending trades.',
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: enums.Subcommand.View,
				description: 'View a card in a collection.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.Integer,
						name: 'position',
						description: 'The position of the card to view',
						required: true,
					},
					{
						type: DAPI.ApplicationCommandOptionType.User,
						name: 'user',
						description: 'The user whose collection to view',
						required: false,
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: enums.Subcommand.Archive,
				description: 'Look up cards that exist in Catcha.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.String,
						name: 'card',
						description: 'The card (by name or by card ID) to look up',
						required: true,
						autocomplete: true,
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: enums.Subcommand.Stats,
				description: "See your or another user's Catcha statistics.",

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.User,
						name: 'user',
						description: 'The user whose statistics to view',
						required: false,
					},
				],
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: enums.Subcommand.Event,
				description: 'See details about the currently ongoing event and check your cooldowns.',
			},
			{
				type: DAPI.ApplicationCommandOptionType.Subcommand,
				name: enums.Subcommand.Burn,
				description: 'Permanently delete cards from your collection.',

				options: [
					{
						type: DAPI.ApplicationCommandOptionType.String,
						name: 'cards',
						description: 'The cards to burn by position (multiple card positions separated by commas)',
						required: true,
					},
				],
			},
		],
	},

	async execute({ interaction, user, subcommandGroup, subcommand, options, env, ctx }) {
		if (!subcommand) throw 'No subcommand provided';

		// Filter by group first
		if (subcommandGroup?.name === enums.Subcommand.Trade) {
			switch (subcommand.name) {
				case enums.Subcommand.TradeRequest:
					return await tradeInteractions.onTradeRequest(interaction, subcommand.options!, user, env, ctx);
				case enums.Subcommand.TradeCancel:
					return await tradeInteractions.onTradeCancel(interaction, subcommand.options!, user, env, ctx);
				case enums.Subcommand.TradeClear:
					return await tradeInteractions.onTradeClear(interaction, user, env, ctx);
				default:
				// Do nothing
			}
		}

		// All of the ungrouped subcommands
		switch (subcommand.name) {
			case enums.Subcommand.Roll:
				if (options && options.length > 0 && options[0].type === DAPI.ApplicationCommandOptionType.Integer) {
					const cachedRollNumber = options[0].value;

					return await roll.showCachedRoll(interaction, user, cachedRollNumber, env, ctx);
				}

				return await roll.rollCard(interaction, user, env, ctx);
			case enums.Subcommand.List:
				return await list.handleListSubcommand(interaction, options, user, env, ctx);
			case enums.Subcommand.Locate:
				return await locate.handleLocateSubcommand(interaction, options!, user, env, ctx);
			case enums.Subcommand.Duplicates:
				return await duplicates.handleDuplicatesSubcommand(interaction, options, user, env, ctx);
			case enums.Subcommand.Remaining:
				return await remaining.handleRemainingSubcommand(interaction, options, user, env, ctx);
			case enums.Subcommand.View:
				return await view.handleViewCommand(interaction, options!, user, env, ctx);
			case enums.Subcommand.Archive:
				return archiveSubcommand.onArchive(interaction, options!, user, env, ctx);
			case enums.Subcommand.Stats:
				return await statsSubcommand.onStatsSubcommand(interaction, options, user, env, ctx);
			case enums.Subcommand.Event:
				return await eventSubcommand.handleEventSubcommand(interaction, options, user, env, ctx);
			case enums.Subcommand.Burn:
				return await burn.handleBurn(interaction, options!, user, env, ctx);
			default:
			// Do nothing
		}
	},

	async onMessageComponent({ interaction, user, componentType, customId, parsedCustomId, values, env, ctx }) {
		const action = parsedCustomId[1];

		switch (action) {
			case 'roll':
				return await roll.rollCard(interaction, user, env, ctx);
			case 'claim':
				return await claim.onClaim(interaction, user, parsedCustomId, env, ctx);
			case 'list':
				return await list.handleListScroll(interaction, user, parsedCustomId, env, ctx);
			case 'locate':
				return await locate.handleLocateScroll(interaction, user, parsedCustomId, env, ctx);
			case 'duplicates':
				return await duplicates.handleDuplicatesScroll(interaction, user, parsedCustomId, env, ctx);
			case 'remaining':
				return await remaining.handleRemainingScroll(interaction, user, parsedCustomId, env, ctx);
			case 'trade':
				return await tradeInteractions.onTradeMessageComponent(interaction, user, parsedCustomId, env, ctx);
			case 'art':
				return onArtScroll(interaction, user, parsedCustomId);
			case 'burn':
				return await burn.handleBurnMessageComponent(interaction, user, parsedCustomId, env, ctx);
			case 'view':
				return await view.handleViewMessageComponent(interaction, user, parsedCustomId, env, ctx);
			default:
			// Do nothing
		}
	},

	async onAutocomplete({ interaction, user, subcommandGroup, subcommand, options, focusedOption, env, ctx }) {
		// If the focused option name is 'card', autofill card names from the archive
		if (focusedOption.name === 'card' && focusedOption.type === DAPI.ApplicationCommandOptionType.String) {
			return { choices: getAutocompleteChoices(focusedOption.value) };
		}

		// Unknown focused option. Return a default error message.
		return {
			choices: [
				{
					name: 'Error - Something went wrong',
					value: 'Error',
				},
			],
		};
	},
};

export default CatchaCommand;
