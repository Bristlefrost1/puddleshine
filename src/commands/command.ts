/**
 * command.ts
 *
 * The common command object interface.
 */

import * as DAPI from 'discord-api-types/v10'
import { type PuddleshineBot } from '@/bot'

interface Handler {
	/**
	 * The application command interaction handler.
	 *
	 * @param options The interaction options.
	 * @returns An interaction response or void. Returning void will raise an error.
	 */
	onApplicationCommand?: (options: {
		/**
		 * The application command interaction.
		 *
		 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
		 */
		interaction: DAPI.APIApplicationCommandInteraction

		/**
		 * The user that executed the application command.
		 *
		 * https://discord.com/developers/docs/resources/user#user-object
		 */
		user: DAPI.APIUser

		/**
		 * The subcommand group if the executed subcommand belongs to a group.
		 */
		subcommandGroup?: DAPI.APIApplicationCommandInteractionDataSubcommandGroupOption

		/**
		 * The subcommand that was executed.
		 */
		subcommand?: DAPI.APIApplicationCommandInteractionDataSubcommandOption

		/**
		 * The application command options.
		 */
		options?: DAPI.APIApplicationCommandInteractionDataBasicOption[]
	}) => Promise<DAPI.APIInteractionResponse | void>

	/**
	 * The message component interaction handler.
	 *
	 * @param options The interaction options.
	 * @returns An interaction response or void. Returning void will raise an error.
	 */
	onMessageComponent?: (options: {
		/**
		 * The message component interaction.
		 */
		interaction: DAPI.APIMessageComponentInteraction

		/**
		 * The user that interacted with a message component.
		 *
		 * https://discord.com/developers/docs/resources/user#user-object
		 */
		user: DAPI.APIUser

		/**
		 * The component type.
		 *
		 * https://discord.com/developers/docs/interactions/message-components#component-object-component-types
		 */
		componentType: DAPI.ComponentType

		/**
		 * The full custom ID of the component.
		 */
		customId: string

		/**
		 * The custom ID split by `/`.
		 */
		parsedCustomId: string[]

		/**
		 * The values of the component (for selection menus).
		 */
		values?: string[]
	}) => Promise<DAPI.APIInteractionResponse | void>

	/**
	 * The modal interaction handler.
	 *
	 * @param options The interaction options.
	 * @returns An interaction response or void. Returning void will raise an error.
	 */
	onModal?: (options: {
		/**
		 * The modal submit interaction.
		 */
		interaction: DAPI.APIModalSubmitInteraction

		/**
		 * The user that submitted the modal.
		 *
		 * https://discord.com/developers/docs/resources/user#user-object
		 */
		user: DAPI.APIUser

		/**
		 * The full custom ID of the modal.
		 */
		customId: string

		/**
		 * The custom ID split by `/`.
		 */
		parsedCustomId: string[]

		/**
		 * The components of the modal.
		 */
		components: DAPI.ModalSubmitActionRowComponent[]
	}) => Promise<DAPI.APIInteractionResponse | void>

	/**
	 * The autocomplete interaction handler.
	 *
	 * @param options The interaction options.
	 * @returns An autocomplete interaction response.
	 */
	onAutocomplete?: (options: {
		/**
		 * The autocomplete interaction.
		 */
		interaction: DAPI.APIApplicationCommandAutocompleteInteraction

		/**
		 * The user that triggered the autocompletion.
		 *
		 * https://discord.com/developers/docs/resources/user#user-object
		 */
		user: DAPI.APIUser

		/**
		 * The subcommand group if the subcommand belongs to a group.
		 */
		subcommandGroup?: DAPI.APIApplicationCommandInteractionDataSubcommandGroupOption | undefined

		/**
		 * The subcommand.
		 */
		subcommand?: DAPI.APIApplicationCommandInteractionDataSubcommandOption | undefined

		/**
		 * The application command options.
		 */
		options: DAPI.APIApplicationCommandInteractionDataBasicOption[]

		/**
		 * The option that is currently focused and that the user is trying to autocomplete.
		 */
		focusedOption:
			| DAPI.APIApplicationCommandInteractionDataStringOption
			| DAPI.APIApplicationCommandInteractionDataIntegerOption
	}) => Promise<DAPI.APICommandAutocompleteInteractionResponseCallbackData>
}

/**
 * A subcommand that belongs to another command.
 */
interface Subcommand extends Handler {
	/**
	 * The name of the subcommand.
	 */
	name: string

	/**
	 * The subcommand data, will be sent to the Discord API to sync the subcommand.
	 */
	subcommand: DAPI.APIApplicationCommandSubcommandOption
}

/**
 * A command that has various handlers for different interaction types.
 */
interface Command extends Handler {
	/**
	 * The name of the command.
	 */
	name: string

	/**
	 * If specified, the command will be a guild command and only work in these guilds.
	 */
	onlyGuilds?: string[]

	/**
	 * The subcommands that the command has.
	 */
	subcommands?: { [name: string]: Subcommand | { [name: string]: Subcommand } }

	/**
	 * The application command data that will be sent to the Discord API to sync the command.
	 */
	commandData: DAPI.RESTPostAPIApplicationCommandsJSONBody
}

export type { Command, Subcommand }
