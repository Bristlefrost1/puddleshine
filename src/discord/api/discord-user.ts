import * as DAPI from 'discord-api-types/v10'

import { botHeaders } from './api-utils'

export async function discordGetUser({ id, token }: { id: DAPI.Snowflake, token: string }) {
	const url = `https://discord.com/api/v10/users/${id}`

	const response = await fetch(url, {
		headers: botHeaders(token, null),
		method: 'GET',
	})

	if (!response.ok) {
		return null
	}

	const user = (await response.json()) as DAPI.APIUser

	return user
}
