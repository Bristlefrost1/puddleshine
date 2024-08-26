import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const config = await import('../dist/src/config.js');

function getEnvVariable(name, environment) {
	let envVariableName = name;

	if (environment !== undefined && typeof environment === 'string') {
		envVariableName = `${environment.toUpperCase()}_${envVariableName}`;
	}

	return process.env[envVariableName];
}

const env = process.env.ENV;

const cloudflareAccountId = getEnvVariable('CLOUDFLARE_ACCOUNT_ID', env);
const workerName = getEnvVariable('WORKER_NAME', env) ?? 'puddleshine';
const d1Name = getEnvVariable('D1_DB_NAME', env);
const d1Id = getEnvVariable('D1_DB_ID', env);
const kvId = getEnvVariable('KV_ID', env);

const discordApplicationId = getEnvVariable('DISCORD_APPLICATION_ID', env);

if (!cloudflareAccountId || !workerName || !d1Name || !d1Id || !kvId || !discordApplicationId) {
	throw new Error("The environment variables aren't set up correctly.");
}

const wranglerConfig = `
name = "${workerName}"
main = "dist/worker/worker.mjs"
compatibility_date = "2024-08-26"
compatibility_flags = ["nodejs_compat"]

[placement]
mode = "smart"

[triggers]
crons = [ "${config.DAILY_CRON}", "${config.WEEKLY_CRON}" ]

[vars]
DISCORD_APPLICATION_ID = "${discordApplicationId}"
ENV = "${env}"

[[d1_databases]]
binding = "DB"
database_name = "${d1Name}"
database_id = "${d1Id}"

[[kv_namespaces]]
binding = "KV"
id = "${kvId}"
`;

fs.writeFileSync('./wrangler.toml', wranglerConfig);

if (process.env['WRANGLER_TOML']) {
	console.log('wrangler.toml file written');
	process.exit(0);
}

const spawnedProcess = spawn(
	`${cloudflareAccountId !== undefined ? `CLOUDFLARE_ACCOUNT_ID=${cloudflareAccountId} ` : ''}npx wrangler deploy`,
	['--no-bundle'],
	{
		stdio: 'pipe',
		shell: true,
	},
);

spawnedProcess.stdout.on('data', (data) => {
	console.log(data.toString('utf-8'));
});

spawnedProcess.stderr.on('data', (data) => {
	console.error(data.toString('utf-8'));
});

spawnedProcess.on('close', (code) => {
	console.log(`Finished with code ${code}`);
});
