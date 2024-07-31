import * as DAPI from 'discord-api-types/v10';

async function discordGetUser(token: string, id: DAPI.Snowflake) {
	const url = `https://discord.com/api/v10/users/${id}`;

	const response = await fetch(url, {
		headers: {
			Accept: 'application/json',
			Authorization: `Bot ${token}`,
		},
		method: 'GET',
	});

	if (!response.ok) {
		return null;
	}

	const user = (await response.json()) as DAPI.APIUser;

	return user;
}

function getUserFromInteraction(interaction: DAPI.APIInteraction): DAPI.APIUser {
	let returnUser: DAPI.APIUser;

	if (interaction.member) {
		const member = interaction.member;
		returnUser = member.user;
	} else {
		returnUser = interaction.user as DAPI.APIUser;
	}

	return returnUser;
}

export { discordGetUser };
