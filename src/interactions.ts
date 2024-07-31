/**
 * interactions.ts
 *
 * This file handles all of the interactions coming from Discord, forwarding them
 * to an appropriate handler.
 */

import * as DAPI from 'discord-api-types/v10';

import { commands } from '#commands/command-registry.js';

const errorResponse: DAPI.APIInteractionResponse = {
	type: DAPI.InteractionResponseType.ChannelMessageWithSource,
	data: {
		flags: DAPI.MessageFlags.Ephemeral,
		content: 'Something went wrong.',
	},
};

/**
 * Parses the application command in an interaction for the subcommand group,
 * subcommand, options, and focused option objects (focused only if an autocomplete interaction).
 *
 * @param interaction The application command or autocomplete interaction.
 * @returns The subcommand group, subcommand, options, and focused option, if they exist.
 */
function parseApplicationCommand(
	interaction: DAPI.APIApplicationCommandInteraction | DAPI.APIApplicationCommandAutocompleteInteraction,
) {
	let subcommandGroup: DAPI.APIApplicationCommandInteractionDataSubcommandGroupOption | undefined;
	let subcommand: DAPI.APIApplicationCommandInteractionDataSubcommandOption | undefined;
	let options: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined;
	let focusedOption:
		| DAPI.APIApplicationCommandInteractionDataStringOption
		| DAPI.APIApplicationCommandInteractionDataIntegerOption
		| undefined;

	const handleOption = (subcommandOption: DAPI.APIApplicationCommandInteractionDataBasicOption) => {
		if (!options) options = [];

		options.push(subcommandOption);
		if ((subcommandOption as any).focused) focusedOption = subcommandOption as any;
	};

	if (interaction.data.type === DAPI.ApplicationCommandType.ChatInput && interaction.data.options) {
		for (const option of interaction.data.options) {
			if (option.type === DAPI.ApplicationCommandOptionType.SubcommandGroup) {
				subcommandGroup = option;

				for (const groupOption of subcommandGroup.options) {
					subcommand = groupOption;

					if (subcommand.options) {
						for (const subcommandOption of subcommand.options) {
							handleOption(subcommandOption);
						}
					}
				}
			} else if (option.type === DAPI.ApplicationCommandOptionType.Subcommand) {
				subcommand = option;

				if (subcommand.options) {
					for (const subcommandOption of subcommand.options) {
						handleOption(subcommandOption);
					}
				}
			} else {
				handleOption(option);
			}
		}
	}

	return {
		subcommandGroup,
		subcommand,
		options,
		focusedOption,
	};
}

/**
 * Handles an application command interaction.
 *
 * Throws an error if no application command handler is found
 * or it doesn't return a response.
 *
 * @param interaction The application command interaction.
 * @param env The Worker's env.
 * @param ctx The Worker's execution context.
 * @returns An interaction response.
 */
async function handleApplicationCommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	// Find a handler from the command registry
	if (commands[interaction.data.name]) {
		const command = commands[interaction.data.name];

		// Parse the interaction for the user and application command options
		const user = interaction.user ? interaction.user : interaction.member!.user;
		const { subcommandGroup, subcommand, options } = parseApplicationCommand(interaction);

		// Execute the application command
		const returnResponse = await command.execute({
			interaction: interaction,
			user: user,

			subcommandGroup: subcommandGroup,
			subcommand: subcommand,
			options: options,

			env: env,
			ctx: ctx,
		});

		// Return the response and throw an error if the handler didn't respond
		if (returnResponse) {
			return returnResponse;
		} else {
			throw 'The application command handler returned no response.';
		}
	} else {
		throw `No application command with the name ${interaction.data.name} found.`;
	}
}

/**
 * Handles a message component interaction.
 *
 * Throws an error if no handler is found or it doesn't return a response.
 *
 * @param interaction The message component interaction.
 * @param env The Worker's env.
 * @param ctx The Worker's execution context.
 * @returns An interaction response.
 */
async function handleMessageComponent(
	interaction: DAPI.APIMessageComponentInteraction,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	const user = interaction.user ? interaction.user : interaction.member!.user;

	// The message component custom IDs are used to indicate which command created them and should thus handle them
	// The format is COMMAND/SUBCOMMAND/DATA
	// For example, catcha/trade/y/TRADE_UUID,SIDE1_DISCORD_ID,SIDE2_DISCORD_ID accepts a trade
	// https://discord.com/developers/docs/interactions/message-components#custom-id
	const customId = interaction.data.custom_id;
	const parsedCustomId = customId.split('/');
	const commandName = parsedCustomId[0];

	if (commands[commandName]) {
		const command = commands[commandName];

		if (command.onMessageComponent) {
			const returnResponse = await command.onMessageComponent({
				interaction: interaction,
				user: user,

				componentType: interaction.data.component_type,
				customId: customId,
				parsedCustomId: parsedCustomId,
				values: (interaction.data as any).values,

				env: env,
				ctx: ctx,
			});

			if (returnResponse) {
				return returnResponse;
			} else {
				throw 'The message component handler returned no response.';
			}
		} else {
			throw `The command ${commandName} doesn't implement a message component handler.`;
		}
	} else {
		throw `No handler named ${commandName} found.`;
	}
}

/**
 * Handles an application command autocomplete interaction (such as the card name autocomplete in /catcha locate).
 *
 * @param interaction The autocomplete interaction.
 * @param env The Worker's env.
 * @param ctx The Worker's execution context.
 * @returns An interaction response.
 */
async function handleApplicationCommandAutocomplete(
	interaction: DAPI.APIApplicationCommandAutocompleteInteraction,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIApplicationCommandAutocompleteResponse> {
	if (commands[interaction.data.name]) {
		const command = commands[interaction.data.name];

		const user = interaction.user ? interaction.user : interaction.member!.user;
		const { subcommandGroup, subcommand, options, focusedOption } = parseApplicationCommand(interaction);

		if (!options || !focusedOption) {
			throw 'No options provided';
		}

		if (command.onAutocomplete) {
			const results = await command.onAutocomplete({
				interaction: interaction,
				user: user,

				subcommandGroup: subcommandGroup,
				subcommand: subcommand,
				options: options,
				focusedOption: focusedOption,

				env: env,
				ctx: ctx,
			});

			return {
				type: DAPI.InteractionResponseType.ApplicationCommandAutocompleteResult,
				data: results,
			};
		} else {
			throw `The command ${interaction.data.name} doesn't implement an autocomplete handler.`;
		}
	} else {
		throw `No application command with the name ${interaction.data.name} found.`;
	}
}

/**
 * Catch potential errors in the interaction handlers. Catches the error and returns an ephemeral message instead of crashing.
 *
 * @param handler The interaction handler.
 * @returns The interaction handler response or an ephemeral error message.
 */
async function catchErrors(handler: Promise<DAPI.APIInteractionResponse>) {
	let response: DAPI.APIInteractionResponse;

	try {
		response = await handler;
	} catch (error) {
		console.error(error); // For logging purposes

		response = {
			type: DAPI.InteractionResponseType.ChannelMessageWithSource,
			data: {
				flags: DAPI.MessageFlags.Ephemeral,
				content: `An error occured when handling the interaction: ${error ? error : 'Unknown error'}`,
			},
		};
	}

	return response;
}

/**
 * Fired when an interaction is received from Discord.
 *
 * @param interaction The interaction.
 * @param env The Worker's env.
 * @param ctx The Worker's context.
 * @returns A response to the API interaction or `null` if there was a serious error.
 */
async function onInteractionReceived(
	interaction: DAPI.APIInteraction,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	// Ack a ping from Discord and return
	if (interaction.type === DAPI.InteractionType.Ping) {
		// The `PING` message is used during the initial webhook handshake, and is
		// required to configure the webhook in the developer portal.
		return { type: DAPI.InteractionResponseType.Pong };
	}

	// If the interaction isn't a ping, forward it to the correct handler for the interaction type
	switch (interaction.type) {
		case DAPI.InteractionType.ApplicationCommand:
			return await catchErrors(handleApplicationCommand(interaction, env, ctx));

		case DAPI.InteractionType.MessageComponent:
			return await catchErrors(handleMessageComponent(interaction, env, ctx));

		case DAPI.InteractionType.ApplicationCommandAutocomplete:
			return await handleApplicationCommandAutocomplete(interaction, env, ctx);

		default:
			return {
				type: DAPI.InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: DAPI.MessageFlags.Ephemeral,
					content: 'Unknown interaction type',
				},
			};
	}
}

export { onInteractionReceived };
