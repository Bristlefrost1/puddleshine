import * as DAPI from 'discord-api-types/v10';

function parseCommandOptions(commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined) {
	if (!commandOptions) return {};

	const options: { [name: string]: DAPI.APIApplicationCommandInteractionDataBasicOption } = {};

	for (const option of commandOptions) {
		options[option.name] = option;
	}

	return options;
}

export { parseCommandOptions };
