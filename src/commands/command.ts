/**
 * command.ts
 *
 * The common command object interface.
 */

import * as DAPI from 'discord-api-types/v10';

/**
 * A command that has various handlers for different interaction types.
 */
interface Command {
	/**
	 * The command name.
	 */
	name: string;

	/**
	 * If specified, the command will be a guild command and only work in these guilds
	 */
	onlyGuilds?: string[];

	/**
	 * The slash command data that will be sent to the Discord API to reigster the command.
	 */
	commandData: DAPI.RESTPostAPIApplicationCommandsJSONBody;

	/**
	 * The handler that will be fired for every application command interaction.
	 *
	 * @param options The interaction options.
	 * @returns An interaction response or void. Returning void will raise an error.
	 */
	execute: (options: {
		/**
		 * The application command interaction.
		 *
		 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
		 */
		interaction: DAPI.APIApplicationCommandInteraction;

		/**
		 * The user that executed the application command.
		 *
		 * https://discord.com/developers/docs/resources/user#user-object
		 */
		user: DAPI.APIUser;

		/**
		 * The subcommand group if the executed subcommand belongs to a group.
		 */
		subcommandGroup?: DAPI.APIApplicationCommandInteractionDataSubcommandGroupOption;

		/**
		 * The subcommand that was executed.
		 */
		subcommand?: DAPI.APIApplicationCommandInteractionDataSubcommandOption;

		/**
		 * The application command options.
		 */
		options?: DAPI.APIApplicationCommandInteractionDataBasicOption[];

		/**
		 * The Worker's env.
		 */
		env: Env;

		/**
		 * The Worker's execution context.
		 */
		ctx: ExecutionContext;
	}) => Promise<DAPI.APIInteractionResponse | void>;

	/**
	 * The handler that will be fired for message component interactions.
	 *
	 * @param options The interaction options.
	 * @returns An interaction response or void. Returning void will raise an error.
	 */
	onMessageComponent?: (options: {
		/**
		 * The message component interaction.
		 */
		interaction: DAPI.APIMessageComponentInteraction;

		/**
		 * The user that interacted with a message component.
		 *
		 * https://discord.com/developers/docs/resources/user#user-object
		 */
		user: DAPI.APIUser;

		/**
		 * The component type.
		 *
		 * https://discord.com/developers/docs/interactions/message-components#component-object-component-types
		 */
		componentType: DAPI.ComponentType;

		/**
		 * The full custom ID of the component.
		 */
		customId: string;

		/**
		 * The custom ID split by `/`.
		 */
		parsedCustomId: string[];

		/**
		 * The values of the component (for selection menus).
		 */
		values?: string[];

		/**
		 * The Worker's env.
		 */
		env: Env;

		/**
		 * The Worker's execution context.
		 */
		ctx: ExecutionContext;
	}) => Promise<DAPI.APIInteractionResponse | void>;

	/**
	 * The handler that will be fired for autocomplete interactions.
	 *
	 * @param options The interaction options.
	 * @returns An autocomplete interaction response.
	 */
	onAutocomplete?: (options: {
		/**
		 * The autocomplete interaction.
		 */
		interaction: DAPI.APIApplicationCommandAutocompleteInteraction;

		/**
		 * The user that triggered the autocompletion.
		 *
		 * https://discord.com/developers/docs/resources/user#user-object
		 */
		user: DAPI.APIUser;

		/**
		 * The subcommand group if the subcommand belongs to a group.
		 */
		subcommandGroup?: DAPI.APIApplicationCommandInteractionDataSubcommandGroupOption | undefined;

		/**
		 * The subcommand.
		 */
		subcommand?: DAPI.APIApplicationCommandInteractionDataSubcommandOption | undefined;

		/**
		 * The application command options.
		 */
		options: DAPI.APIApplicationCommandInteractionDataBasicOption[];

		/**
		 * The option that is currently focused and that the user is trying to autocomplete.
		 */
		focusedOption:
			| DAPI.APIApplicationCommandInteractionDataStringOption
			| DAPI.APIApplicationCommandInteractionDataIntegerOption;

		/**
		 * The Worker's env.
		 */
		env: Env;

		/**
		 * The Worker's execution context.
		 */
		ctx: ExecutionContext;
	}) => Promise<DAPI.APICommandAutocompleteInteractionResponseCallbackData>;
}

export type { Command };
