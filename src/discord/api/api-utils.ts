import { VERSION_STRING } from '@/config'

/**
 * Constructs the HTTP headers required for sending an API request to Discord.
 * 
 * @param token The bot's token (required).
 * @param contentType The `Content-Type` header (defaults to `application/json`, pass `null` to omit the header).
 * @param accept The `Accept` header (defaults to `application/json`, pass `null` to omit the header).
 * @returns The headers required by the Discord API (`Authorization`, `User-Agent`, `Content-Type`, and `Accept`).
 */
export const botHeaders = (token: string, contentType?: string | null, accept?: string | null): HeadersInit => {
	const headers: HeadersInit = {
		'Authorization': `Bot ${token}`,
		'User-Agent': `DiscordBot (https://github.com/Bristlefrost1/puddleshine, ${VERSION_STRING})`,
	}

	if (contentType !== null) {
		headers['Content-Type'] = contentType ?? 'application/json'
	}

	if (accept !== null) {
		headers['Accept'] = accept ?? 'application/json'
	}

	return headers
}
