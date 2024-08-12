import * as DAPI from 'discord-api-types/v10';

interface Subcommand {
	name: string;

	subcommand: DAPI.APIApplicationCommandSubcommandOption;

	execute: (options: {
		interaction: DAPI.APIApplicationCommandInteraction;
		user: DAPI.APIUser;
		commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined;
		env: Env;
		ctx: ExecutionContext;
	}) => Promise<DAPI.APIInteractionResponse | void>;

	handleMessageComponent?: (options: {
		interaction: DAPI.APIMessageComponentInteraction;
		user: DAPI.APIUser;
		parsedCustomId: string[];
		env: Env;
		ctx: ExecutionContext;
	}) => Promise<DAPI.APIInteractionResponse | void>;

	onModal?: (options: {
		/**
		 * The modal submit interaction.
		 */
		interaction: DAPI.APIModalSubmitInteraction;

		/**
		 * The user that submitted the modal.
		 *
		 * https://discord.com/developers/docs/resources/user#user-object
		 */
		user: DAPI.APIUser;

		/**
		 * The full custom ID of the modal.
		 */
		customId: string;

		/**
		 * The custom ID split by `/`.
		 */
		parsedCustomId: string[];

		/**
		 * The components of the modal.
		 */
		components: DAPI.ModalSubmitActionRowComponent[];

		/**
		 * The Worker's env.
		 */
		env: Env;

		/**
		 * The Worker's execution context.
		 */
		ctx: ExecutionContext;
	}) => Promise<DAPI.APIInteractionResponse | void>;
}

export type { Subcommand };
