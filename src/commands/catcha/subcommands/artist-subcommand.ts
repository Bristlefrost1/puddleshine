import * as DAPI from 'discord-api-types/v10'

import * as listMessage from '@/discord/list-message'
import { parseCommandOptions } from '@/discord/parse-options'
import { bot } from '@/bot'
import {
	messageResponse,
	simpleEphemeralResponse,
	embedMessageResponse,
	errorEmbed,
	simpleMessageResponse,
} from '@/discord/responses'

import * as archive from '@/commands/catcha/archive/archive'
import * as artistDB from '@/commands/catcha/artist/artist-db'

import { type Subcommand } from '@/commands'

const SUBCOMMAND_NAME = 'artist'
const SQL_DATE_REGEX = /^\d{4}-[0-1]\d-[0-3]\d [0-2]\d:[0-5]\d:[0-5]\d$/
const ISO_8601_DATE_REGEX =
	/(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/

function editProfileActionRow(
	discordId: string,
	pageNumber: number,
): DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent> {
	return {
		type: DAPI.ComponentType.ActionRow,
		components: [
			{
				type: DAPI.ComponentType.Button,
				custom_id: `catcha/artist/edit-profile/${discordId},${pageNumber}`,
				style: DAPI.ButtonStyle.Secondary,
				label: '✏️ Edit Your Artist Profile',
			},
		],
	}
}

async function listArtistArt(artist: string) {
	const lowercaseArtist = artist.trim().toLowerCase()

	const artList: string[] = []
	const fullArchive = await archive.getArchive()

	for (const card of fullArchive) {
		if (card.art && card.art.length > 0) {
			const totalArt = card.art.length

			for (let i = 0; i < totalArt; i++) {
				const art = card.art[i]
				const artNumber = i + 1

				if (art.credit && art.credit.toLowerCase() === lowercaseArtist) {
					artList.push(`[#${card.id}] ${archive.getCardFullName({ card })} (art ${artNumber}/${totalArt})`)
				}
			}
		}

		if (card.variants && card.variants.length > 0) {
			for (const variant of card.variants) {
				if (variant.art && variant.art.length > 0) {
					const totalArt = variant.art.length

					for (let i = 0; i < totalArt; i++) {
						const art = variant.art[i]
						const artNumber = i + 1

						if (art.credit && art.credit.toLowerCase() === lowercaseArtist) {
							artList.push(
								`[#${card.id}] ${archive.getCardFullName({ card, inverted: false, variant: variant.variant })} (art ${artNumber}/${totalArt})`,
							)
						}
					}
				}
			}
		}
	}

	return artList
}

export default {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'View profiles of artists that have contributed to Catcha.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'artist',
				description: 'The artist whose profile to view',
				required: true,
				autocomplete: true,
			},
		],
	},

	async onApplicationCommand(options) {
		const { artist } = parseCommandOptions(options.options)

		if (artist === undefined || artist.type !== DAPI.ApplicationCommandOptionType.String)
			return simpleEphemeralResponse('No artist option provided')

		const artList = await listArtistArt(artist.value)
		if (artList.length === 0) return embedMessageResponse(errorEmbed('No art found with this input.'))

		const artistProfile = await artistDB.findArtistProfile(artist.value, bot.prisma)

		const artistDisplayName = artistProfile && artistProfile.displayName ? artistProfile.displayName : artist.value
		let description = artistProfile && artistProfile.description ? artistProfile.description + '\n\n' : ''

		description += 'Contributed art:\n'

		const list = listMessage.createListMessage({
			action: 'catcha/artist',
			listDataString: artist.value,

			items: artList,

			title: `Artist Profile: ${artistDisplayName}`,
			description,
		})

		const components: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[] = []

		if (list.scrollActionRow !== undefined) components.push(list.scrollActionRow)

		if (artistProfile && artistProfile.discordId && options.user.id === artistProfile.discordId) {
			components.push(editProfileActionRow(artistProfile.discordId, 1))
		}

		return messageResponse({
			embeds: [list.embed],
			components: components,
			allowedMentions: {
				users: [],
				roles: [],
			},
		})
	},

	async onMessageComponent(options) {
		const subcommandAction = options.parsedCustomId[2]

		if (subcommandAction.startsWith('next:') || subcommandAction.startsWith('prev:')) {
			const pageData = options.parsedCustomId[2]
			const artistName = options.parsedCustomId[3]

			const artList = await listArtistArt(artistName)

			if (artList.length === 0) {
				return messageResponse({
					embeds: [errorEmbed('No art found.')],
					update: true,
				})
			}

			const artistProfile = await artistDB.findArtistProfile(artistName, bot.prisma)

			const artistDisplayName =
				artistProfile && artistProfile.displayName ? artistProfile.displayName : artistName
			let description = artistProfile && artistProfile.description ? artistProfile.description + '\n\n' : ''

			description += 'Contributed art:\n'

			const newList = listMessage.scrollListMessage({
				action: 'catcha/artist',
				pageData,
				listDataString: artistName,

				items: artList,

				title: `Artist Profile: ${artistDisplayName}`,
				description,
			})

			const components: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[] = []

			if (newList.scrollActionRow !== undefined) components.push(newList.scrollActionRow)

			if (artistProfile && artistProfile.discordId && options.user.id === artistProfile.discordId) {
				components.push(editProfileActionRow(artistProfile.discordId, Number.parseInt(pageData.split(':')[1])))
			}

			return messageResponse({
				embeds: [newList.embed],
				components: components,
				allowedMentions: {
					users: [],
					roles: [],
				},
				update: true,
			})
		} else if (subcommandAction === 'edit-profile') {
			const data = options.parsedCustomId[3].split(',')
			const userId = data[0]
			const pageNumber = Number.parseInt(data[1])

			if (options.user.id !== userId) return simpleEphemeralResponse('This is not your prompt.')

			const artistProfile = await artistDB.findArtistProfileWithDiscordId(userId, bot.prisma)
			const modalValue = artistProfile && artistProfile.description ? artistProfile.description : undefined

			return {
				type: DAPI.InteractionResponseType.Modal,
				data: {
					custom_id: `catcha/artist/edit-profile-modal/${userId},${pageNumber}`,
					title: 'Update your artist profile',
					components: [
						{
							type: DAPI.ComponentType.ActionRow,
							components: [
								{
									type: DAPI.ComponentType.TextInput,
									custom_id: 'profile',
									style: DAPI.TextInputStyle.Paragraph,
									label: 'Your artist profile',
									max_length: 1024,
									required: true,
									value: modalValue,
									placeholder:
										'This will be shown in /catcha artist. Introduce yourself and add your links.',
								},
							],
						},
					],
				},
			}
		}
	},

	async onModal(options) {
		const subcommandAction = options.parsedCustomId[2]

		if (subcommandAction === 'edit-profile-modal' || subcommandAction === 'admin-edit-profile-modal') {
			const form = options.components[0]
			const textField = form.components[0]

			if (!textField || textField.type !== DAPI.ComponentType.TextInput || textField.custom_id !== 'profile')
				return simpleEphemeralResponse('No profile text field provided.')

			const updatedProfileDescription = textField.value.trim()

			if (updatedProfileDescription.match(ISO_8601_DATE_REGEX) || updatedProfileDescription.match(SQL_DATE_REGEX))
				return simpleEphemeralResponse('This profile description contains blacklisted words.')

			const data = options.parsedCustomId[3].split(',')
			const userId = data[0]

			const artistProfile = await artistDB.findArtistProfileWithDiscordId(userId, bot.prisma)
			if (!artistProfile) return simpleEphemeralResponse('No artist profile found.')

			const artistProfileName = artistProfile.name

			const updatedArtistProfile = await artistDB.updateDescription(
				artistProfileName,
				updatedProfileDescription,
				bot.prisma,
			)

			if (subcommandAction === 'admin-edit-profile-modal' || !data[1])
				return simpleMessageResponse('Profile updated.')

			const pageNumber = Number.parseInt(data[1])
			const artList = await listArtistArt(artistProfileName)

			if (artList.length === 0) {
				return messageResponse({
					embeds: [errorEmbed('No art found.')],
					update: true,
				})
			}

			const artistDisplayName =
				updatedArtistProfile.displayName ? updatedArtistProfile.displayName : artistProfileName
			let description = updatedArtistProfile.description ? updatedArtistProfile.description + '\n\n' : ''

			description += 'Contributed art:\n'

			const list = listMessage.createListMessage({
				action: 'catcha/artist',
				listDataString: artistProfileName,

				items: artList,
				pageNumber,

				title: `Artist Profile: ${artistDisplayName}`,
				description,
			})

			const components: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[] = []

			if (list.scrollActionRow !== undefined) components.push(list.scrollActionRow)

			if (artistProfile && artistProfile.discordId && options.user.id === artistProfile.discordId) {
				components.push(editProfileActionRow(artistProfile.discordId, pageNumber))
			}

			return messageResponse({
				embeds: [list.embed],
				components: components,
				allowedMentions: {
					users: [],
					roles: [],
				},
				update: true,
			})
		}
	},
} as Subcommand
