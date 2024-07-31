import * as process from 'node:process';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const commandRegistry = await import('../dist/src/commands/command-registry.js');

let token;
let applicationId;

if (process.env.ENV === 'prod') {
	token = process.env.PROD_DISCORD_TOKEN;
	applicationId = process.env.PROD_DISCORD_APPLICATION_ID;
} else {
	token = process.env.DEV_DISCORD_TOKEN;
	applicationId = process.env.DEV_DISCORD_APPLICATION_ID;
}

if (!token) {
	throw new Error('The DISCORD_TOKEN environment variable is required.');
}
if (!applicationId) {
	throw new Error('The DISCORD_APPLICATION_ID environment variable is required.');
}

const globalApplicationCommands = [];
/**
 * @type Map<string, any[]>
 */
const guildCommands = new Map();

const commands = Object.values(commandRegistry.commands);

commands.forEach((command) => {
	if (command.onlyGuilds !== undefined && command.onlyGuilds.length > 0) {
		for (const guildId of command.onlyGuilds) {
			const oldGuildCommands = guildCommands.get(guildId);

			if (oldGuildCommands) {
				oldGuildCommands.push(command.commandData);
				guildCommands.set(guildId, oldGuildCommands);
			} else {
				guildCommands.set(guildId, [command.commandData]);
			}
		}
	} else {
		globalApplicationCommands.push(command.commandData);
	}
});

async function registerGlobalApplicationCommands() {
	console.log('Registering global application commands.');

	const apiEndpoint = `https://discord.com/api/v10/applications/${applicationId}/commands`;

	const response = await fetch(apiEndpoint, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${token}`,
		},
		method: 'PUT',
		body: JSON.stringify(globalApplicationCommands),
	});

	if (response.ok) {
		console.log('Successfully registered global application commands.');
	} else {
		console.error(`Error registering global application commands: HTTP ${response.status}`);
	}
}

async function registerGuildCommands() {
	if (guildCommands.size === 0) {
		console.log('No guild commands to register.');
		return;
	}

	for (const [guildId, commandsToRegister] of guildCommands) {
		const apiEndpoint = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;

		const response = await fetch(apiEndpoint, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bot ${token}`,
			},
			method: 'PUT',
			body: JSON.stringify(commandsToRegister),
		});

		if (response.ok) {
			console.log(`Successfully registered guild commands for guild ID ${guildId}.`);
		} else {
			console.error(`Error registering guild commands for guild ID ${guildId}: HTTP ${response.status}`);
		}
	}
}

await registerGlobalApplicationCommands();
await registerGuildCommands();
