/*
 * interactions.ts
 *
 * This file handles all of the interactions coming from Discord, forwarding them
 * to an appropriate handler.
 */

import * as DAPI from 'discord-api-types/v10'

import { type PuddleshineBot } from './bot'
import { commandsRegistry as commands, type Command, type Subcommand } from './commands'
import { simpleEphemeralResponse } from './discord/responses'

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
	let subcommandGroup: DAPI.APIApplicationCommandInteractionDataSubcommandGroupOption | undefined
	let subcommand: DAPI.APIApplicationCommandInteractionDataSubcommandOption | undefined
	let options: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined
	let focusedOption:
		| DAPI.APIApplicationCommandInteractionDataStringOption
		| DAPI.APIApplicationCommandInteractionDataIntegerOption
		| undefined

	const handleOption = (subcommandOption: DAPI.APIApplicationCommandInteractionDataBasicOption) => {
		if (!options) options = []

		options.push(subcommandOption)
		if ((subcommandOption as any).focused) focusedOption = subcommandOption as any
	};

	if (interaction.data.type === DAPI.ApplicationCommandType.ChatInput && interaction.data.options) {
		for (const option of interaction.data.options) {
			if (option.type === DAPI.ApplicationCommandOptionType.SubcommandGroup) {
				subcommandGroup = option

				for (const groupOption of subcommandGroup.options) {
					subcommand = groupOption

					if (subcommand.options) {
						for (const subcommandOption of subcommand.options) {
							handleOption(subcommandOption)
						}
					}
				}
			} else if (option.type === DAPI.ApplicationCommandOptionType.Subcommand) {
				subcommand = option

				if (subcommand.options) {
					for (const subcommandOption of subcommand.options) {
						handleOption(subcommandOption)
					}
				}
			} else {
				handleOption(option)
			}
		}
	}

	return {
		subcommandGroup,
		subcommand,
		options,
		focusedOption,
	}
}

const findSubcommandWithCustomId = (command: Command, parsedCustomId: string[]): Subcommand => {
	const subcommands = command.subcommands

	if (subcommands === undefined) throw `The command ${command.name} doesn't implement a message component handler.`
	if (parsedCustomId[1] === undefined) throw 'No subcommand provided.'

	const subcommandAndGroup = parsedCustomId[1]
	const split = subcommandAndGroup.split('\\')

	const subcommandName = split.length > 1 ? split[1] : split[0]
	const subcommandGroupName = split.length > 1 ? split[0] : undefined

	const subcommand = subcommandGroupName === undefined ? subcommands[subcommandName] as Subcommand : (subcommands[subcommandGroupName] as { [name: string]: Subcommand })[subcommandName]

	return subcommand
}

/**
 * Handles an application command interaction.
 *
 * Throws an error if no application command handler is found
 * or it doesn't return a response.
 *
 * @param interaction The application command interaction.
 * @param bot The bot instance.
 * @returns An interaction response.
 */
async function handleApplicationCommand(interaction: DAPI.APIApplicationCommandInteraction, bot: PuddleshineBot): Promise<DAPI.APIInteractionResponse> {
	// Find a handler from the command registry
	if (commands[interaction.data.name]) {
		// Parse the interaction for the user and application command options
		const command = commands[interaction.data.name]
		const user = interaction.user ? interaction.user : interaction.member!.user
		const { subcommandGroup, subcommand: subcommandOption, options } = parseApplicationCommand(interaction)

		// If the command has any subcommands, the bare command cannot be invoked at all
		if (command.subcommands && Object.keys(command.subcommands).length > 0) {
			if (!subcommandOption) return simpleEphemeralResponse('No subcommand provided.')

			const subcommands = command.subcommands
			const subcommandName = subcommandOption.name
			const subcommand = subcommandGroup === undefined ? subcommands[subcommandName] as Subcommand : (subcommands[subcommandGroup.name] as { [name: string]: Subcommand })[subcommandName]

			if (!subcommand) throw 'The application command handler returned no response.'
			if (subcommand.onApplicationCommand === undefined) throw `The subcommand ${subcommandName} doesn't implement an application command handler.`

			const response = await subcommand.onApplicationCommand({ interaction, user, subcommandGroup, subcommand: subcommandOption, options })

			if (response !== undefined) {
				return response
			} else {
				throw 'The application command handler returned no response.'
			}
		} else {
			if (command.onApplicationCommand === undefined) throw `The command ${command.name} doesn't implement an application command handler.`

			// Execute the application command
			const returnResponse = await command.onApplicationCommand({
				interaction,
				user,

				subcommandGroup,
				subcommand: subcommandOption,
				options,
			})

			// Return the response and throw an error if the handler didn't respond
			if (returnResponse !== undefined) {
				return returnResponse
			} else {
				throw 'The application command handler returned no response.'
			}
		}	
	} else {
		throw `No application command with the name ${interaction.data.name} found.`
	}
}

/**
 * Handles a message component interaction.
 *
 * Throws an error if no handler is found or it doesn't return a response.
 *
 * @param interaction The message component interaction.
 * @returns An interaction response.
 */
async function handleMessageComponent(interaction: DAPI.APIMessageComponentInteraction, bot: PuddleshineBot): Promise<DAPI.APIInteractionResponse> {
	const user = interaction.user ? interaction.user : interaction.member!.user

	// The message component custom IDs are used to indicate which command created them and should thus handle them
	// The format is COMMAND/SUBCOMMAND/DATA
	// For example, catcha/trade/y/TRADE_UUID,SIDE1_DISCORD_ID,SIDE2_DISCORD_ID accepts a trade
	// https://discord.com/developers/docs/interactions/message-components#custom-id
	const customId = interaction.data.custom_id
	const parsedCustomId = customId.split('/')
	const commandName = parsedCustomId[0]

	if (commands[commandName]) {
		const command = commands[commandName]

		const passToSubcommand = async () => {
			const subcommand = findSubcommandWithCustomId(command, parsedCustomId)

			if (!subcommand) throw 'No subcommand message component handler found.'
			if (subcommand.onMessageComponent === undefined) throw `The subcommand ${subcommand.name} doesn't implement a message component handler.`

			const response = await subcommand.onMessageComponent({
				interaction,
				user,
				componentType: interaction.data.component_type,
				customId,
				parsedCustomId,
				values: (interaction.data as any).values,
			})

			if (response) {
				return response
			} else {
				throw 'The message component handler returned no response.'
			}
		}

		if (command.onMessageComponent === undefined) {
			return await passToSubcommand()
		} else {
			const returnResponse = await command.onMessageComponent({
				interaction,
				user,
				componentType: interaction.data.component_type,
				customId,
				parsedCustomId,
				values: (interaction.data as any).values,
			})
	
			if (returnResponse) {
				return returnResponse
			} else {
				return await passToSubcommand()
			}
		}
	} else {
		throw `No handler named ${commandName} found.`
	}
}

/**
 * Handles an application command autocomplete interaction (such as the card name autocomplete in /catcha locate).
 *
 * @param interaction The autocomplete interaction.
 * @returns An interaction response.
 */
async function handleApplicationCommandAutocomplete(
	interaction: DAPI.APIApplicationCommandAutocompleteInteraction,
	bot: PuddleshineBot,
): Promise<DAPI.APIApplicationCommandAutocompleteResponse> {
	if (commands[interaction.data.name]) {
		const command = commands[interaction.data.name]

		if (command.onAutocomplete === undefined) throw `The command ${interaction.data.name} doesn't implement an autocomplete handler.`

		const user = interaction.user ? interaction.user : interaction.member!.user
		const { subcommandGroup, subcommand, options, focusedOption } = parseApplicationCommand(interaction)

		if (!options || !focusedOption) {
			throw 'No options provided'
		}

		const results = await command.onAutocomplete({
			interaction,
			user,

			subcommandGroup,
			subcommand,
			options,
			focusedOption,
		})

		return {
			type: DAPI.InteractionResponseType.ApplicationCommandAutocompleteResult,
			data: results,
		}
	} else {
		throw `No application command with the name ${interaction.data.name} found.`
	}
}

/**
 * Handles a modal submit interaction.
 *
 * Throws an error if no handler is found or it doesn't return a response.
 *
 * @param interaction The modal submit interaction.
 * @returns An interaction response.
 */
async function handleModal(interaction: DAPI.APIModalSubmitInteraction, bot: PuddleshineBot) {
	const user = interaction.user ? interaction.user : interaction.member!.user

	// The message component custom IDs are used to indicate which command created them and should thus handle them
	// The format is COMMAND/SUBCOMMAND/DATA
	// For example, catcha/trade/y/TRADE_UUID,SIDE1_DISCORD_ID,SIDE2_DISCORD_ID accepts a trade
	// https://discord.com/developers/docs/interactions/message-components#custom-id
	const customId = interaction.data.custom_id
	const parsedCustomId = customId.split('/')
	const commandName = parsedCustomId[0]

	interaction.data.components

	if (commands[commandName]) {
		const command = commands[commandName]

		const passToSubcommand = async () => {
			const subcommand = findSubcommandWithCustomId(command, parsedCustomId)

			if (!subcommand) throw 'No subcommand modal handler found.'
			if (subcommand.onModal === undefined) throw `The subcommand ${subcommand.name} doesn't implement a modal handler.`

			const response = await subcommand.onModal({
				interaction,
				user,
				customId,
				parsedCustomId,
				components: interaction.data.components,
			})

			if (response) {
				return response
			} else {
				throw 'The modal handler returned no response.'
			}
		}

		if (command.onModal === undefined) {
			return await passToSubcommand()
		} else {
			const returnResponse = await command.onModal({
				interaction,
				user,
				customId,
				parsedCustomId,
				components: interaction.data.components,
			})
	
			if (returnResponse) {
				return returnResponse
			} else {
				return await passToSubcommand()
			}
		}
	} else {
		throw `No handler named ${commandName} found.`
	}
}

/**
 * Fired when an interaction is received from Discord.
 *
 * @param interaction The interaction.
 * @returns A response to the API interaction.
 */
export async function onInteractionReceived(interaction: DAPI.APIInteraction, bot: PuddleshineBot): Promise<DAPI.APIInteractionResponse> {
	// Ack a ping from Discord and return
	if (interaction.type === DAPI.InteractionType.Ping) {
		// The `PING` message is used during the initial webhook handshake, and is
		// required to configure the webhook in the developer portal.
		return { type: DAPI.InteractionResponseType.Pong }
	}

	try {
		// If the interaction isn't a ping, forward it to the correct handler for the interaction type
		switch (interaction.type) {
			case DAPI.InteractionType.ApplicationCommand:
				return await handleApplicationCommand(interaction, bot)

			case DAPI.InteractionType.MessageComponent:
				return await handleMessageComponent(interaction, bot)

			case DAPI.InteractionType.ApplicationCommandAutocomplete:
				return await handleApplicationCommandAutocomplete(interaction, bot)

			case DAPI.InteractionType.ModalSubmit:
				return await handleModal(interaction, bot)

			default:
				return simpleEphemeralResponse('Unknown interaction type')
		}
	} catch (error) {
		return simpleEphemeralResponse(`An unexpected error occurred: ${error}`)
	}
}
