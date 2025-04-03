/**
 * worker-env.d.ts
 *
 * Add the types that wrangler doesn't auto-generate here (like secrets and such)
 */

interface Env {
	ENV: 'dev' | 'prod'

	DISCORD_PUBLIC_KEY: string
	DISCORD_TOKEN: string
	SYNC_COMMANDS_KEY: string
}
