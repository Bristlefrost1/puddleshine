import * as DAPI from 'discord-api-types/v10';

import * as art from './art.js';

import * as config from '#config.js';

function buildArtDataString(cardId: number, inverted?: boolean, variantIndex?: number) {
	const cardIdString = cardId.toString();
	let invertedString = '';
	let variantString = '';

	if (inverted !== undefined) {
		invertedString = inverted ? '1' : '0';
	}

	if (variantIndex !== undefined) {
		variantString = variantIndex.toString();
	}

	return `${cardIdString},${invertedString},${variantString}`;
}

function parseArtDataString(artDataString: string) {
	const data = artDataString.split(',');

	const cardId = Number.parseInt(data[0]);
	const isInverted = data[1] === '' ? false : Boolean(Number.parseInt(data[1]));
	const variantIndex = data[2] === '' ? undefined : Number.parseInt(data[2]);

	return { cardId, isInverted, variantIndex };
}

function buildArtScrollComponents(
	cardId: number,
	artNumber: number,
	inverted?: boolean,
	variantIndex?: number,
): DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[] {
	const dataString = buildArtDataString(cardId, inverted, variantIndex);

	return [
		{
			type: DAPI.ComponentType.ActionRow,
			components: [
				{
					type: DAPI.ComponentType.Button,
					custom_id: `catcha/art/prev/${dataString}:${artNumber}`,
					style: DAPI.ButtonStyle.Secondary,
					label: '← Previous Art',
				},
				{
					type: DAPI.ComponentType.Button,
					custom_id: `catcha/art/next/${dataString}:${artNumber}`,
					style: DAPI.ButtonStyle.Secondary,
					label: 'Next Art →',
				},
			],
		},
	];
}

function onArtScroll(
	interaction: DAPI.APIMessageComponentInteraction,
	user: DAPI.APIUser,
	parsedCustomId: string[],
): DAPI.APIInteractionResponse {
	const embed = interaction.message.embeds[0];
	const nextOrPrev: 'next' | 'prev' = parsedCustomId[2] as any;
	const artNumberData = parsedCustomId[3].split(':');

	const artData = parseArtDataString(artNumberData[0]);
	const oldArtNumber = Number.parseInt(artNumberData[1]);

	let newArtNumber = oldArtNumber;

	if (nextOrPrev === 'next') {
		newArtNumber++;
	} else if (nextOrPrev === 'prev') {
		newArtNumber--;
	}

	const artCount = art.getArtCount(artData.cardId, artData.variantIndex);

	if (newArtNumber > artCount) {
		newArtNumber = 1;
	} else if (newArtNumber < 1) {
		newArtNumber = artCount;
	}

	const newArt = art.getArtNumbered(artData.cardId, newArtNumber, artData.variantIndex);

	if (newArt.artUrl) {
		embed.image = {
			url: newArt.artUrl,
			width: config.CATCHA_CARD_IMAGE_WIDTH,
		};
	} else {
		embed.image = undefined;
	}

	if (embed.footer) {
		embed.footer.text = newArt.artText;
	} else {
		embed.footer = {
			text: newArt.artText,
		};
	}

	let components = interaction.message.components;

	if (components) {
		let oldArtScrollActionRow: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent> | undefined;
		let oldArtScrollActionRowIndex: number | undefined;

		outerLoop: {
			for (let i = 0; i < components.length; i++) {
				const actionRowComponent = components[i];

				for (const component of actionRowComponent.components) {
					if (component.type === DAPI.ComponentType.Button) {
						const button = component as DAPI.APIButtonComponentWithCustomId;

						if (button.custom_id && button.custom_id.startsWith('catcha/art')) {
							oldArtScrollActionRow = actionRowComponent;
							oldArtScrollActionRowIndex = i;
							break outerLoop;
						}
					}
				}
			}
		}

		if (newArt.totalArt && newArt.artNumber && newArt.totalArt > 1) {
			if (oldArtScrollActionRow && oldArtScrollActionRowIndex !== undefined) {
				components[oldArtScrollActionRowIndex].components = buildArtScrollComponents(
					artData.cardId,
					newArt.artNumber,
					artData.isInverted,
					artData.variantIndex,
				)[0].components;
			} else {
				components.push(
					buildArtScrollComponents(
						artData.cardId,
						newArt.artNumber,
						artData.isInverted,
						artData.variantIndex,
					)[0],
				);
			}
		}
	} else {
		if (newArt.totalArt && newArt.artNumber && newArt.totalArt > 1) {
			components = buildArtScrollComponents(
				artData.cardId,
				newArt.artNumber,
				artData.isInverted,
				artData.variantIndex,
			);
		}
	}

	return {
		type: DAPI.InteractionResponseType.UpdateMessage,
		data: {
			embeds: [embed],
			components: components,
		},
	};
}

export { onArtScroll, buildArtScrollComponents };
