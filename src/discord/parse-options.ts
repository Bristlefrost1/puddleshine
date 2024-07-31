import * as DAPI from 'discord-api-types/v10';

function parseCommandOptions(commandOptions: DAPI.APIApplicationCommandInteractionDataBasicOption[]) {
	const options: { [name: string]: string | number | boolean | undefined } = {};

	for (const option of commandOptions) {
		options[option.name] = option.value;
	}

	return options;
}

export { parseCommandOptions };
