import * as DAPI from 'discord-api-types/v10';

import { parseCommandOptions } from '#discord/parse-options.js';
import { simpleEphemeralResponse, simpleMessageResponse } from '#discord/responses.js';

import * as artistDB from '#commands/catcha/art/artist-db.js';

import { AdminAccessLevel } from '../admin.js';

async function handleArtistAdminCommand(
	interaction: DAPI.APIApplicationCommandInteraction,
	user: DAPI.APIUser,
	accessLevel: AdminAccessLevel,
	subcommand: DAPI.APIApplicationCommandInteractionDataSubcommandOption,
	options: DAPI.APIApplicationCommandInteractionDataBasicOption[] | undefined,
	env: Env,
	ctx: ExecutionContext,
): Promise<DAPI.APIInteractionResponse> {
	if (subcommand.name === 'initialize') {
		const { artist, user: userOption } = parseCommandOptions(options);

		if (!artist || artist.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No artist option provided');

		if (!userOption || userOption.type !== DAPI.ApplicationCommandOptionType.User)
			return simpleEphemeralResponse('No user option provided');

		const artistProfile = await artistDB.findArtistProfile(artist.value, env.PRISMA);
		if (artistProfile) return simpleMessageResponse('This artist profile has already been initialized.');

		await artistDB.initializeArtistProfile(artist.value, userOption.value, env.PRISMA);

		return simpleMessageResponse('Artist profile initialized.');
	} else if (subcommand.name === 'link_user') {
		const { artist, user: userOption } = parseCommandOptions(options);

		if (!artist || artist.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No artist option provided');

		if (!userOption || userOption.type !== DAPI.ApplicationCommandOptionType.User)
			return simpleEphemeralResponse('No user option provided');

		const artistProfile = await artistDB.findArtistProfile(artist.value, env.PRISMA);
		if (!artistProfile) return simpleMessageResponse('No artist profile found.');

		await artistDB.linkArtistProfile(artist.value, userOption.value, env.PRISMA);

		return simpleMessageResponse('Artist profile linked with user.');
	} else if (subcommand.name === 'display_name') {
		const { artist, display_name: displayName } = parseCommandOptions(options);

		if (!artist || artist.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No artist option provided');

		if (!displayName || displayName.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No display name option provided');

		const artistProfile = await artistDB.findArtistProfile(artist.value, env.PRISMA);
		if (!artistProfile) return simpleMessageResponse('No artist profile found.');

		await artistDB.updateDisplayName(artist.value, displayName.value, env.PRISMA);

		return simpleMessageResponse('Artist profile updated.');
	} else if (subcommand.name === 'description') {
		const { artist } = parseCommandOptions(options);

		if (!artist || artist.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No artist option provided');

		const artistProfile = await artistDB.findArtistProfile(artist.value, env.PRISMA);
		if (!artistProfile) return simpleMessageResponse('No artist profile found.');

		if (!artistProfile.discordId)
			return simpleMessageResponse("This artist profile isn't linked to any Discord account.");

		const modalValue = artistProfile && artistProfile.description ? artistProfile.description : undefined;

		return {
			type: DAPI.InteractionResponseType.Modal,
			data: {
				custom_id: `catcha/artist/admin-edit-profile-modal/${artistProfile.discordId}`,
				title: 'Update artist profile',
				components: [
					{
						type: DAPI.ComponentType.ActionRow,
						components: [
							{
								type: DAPI.ComponentType.TextInput,
								custom_id: 'profile',
								style: DAPI.TextInputStyle.Paragraph,
								label: 'Artist profile',
								max_length: 1024,
								required: true,
								value: modalValue,
								placeholder: 'This will be shown in /catcha artist.',
							},
						],
					},
				],
			},
		};
	}

	return simpleEphemeralResponse('No command found.');
}

export { handleArtistAdminCommand };
