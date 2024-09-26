import * as randomUtils from '#utils/random-utils.js';

import type { WeightedValue } from '#utils/random-utils.js';

enum PeltType {
	SolidColor = 'SolidColor',
	Bicolor = 'Bicolor',
	Tabby = 'Tabby',
	Tortoiseshell = 'Tortoiseshell',
	Colorpoint = 'Colorpoint',
}

enum PeltColor {
	White = 'White',
	Black = 'Black',

	Blue = 'Blue',

	Gray = 'Gray',
	LightGray = 'Light Gray',
	DarkGray = 'Dark Gray',
	PaleGray = 'Pale Gray',
	Silver = 'Silver',

	Orange = 'Orange',
	Ginger = 'Ginger',
	Red = 'Red',
	LightGinger = 'Light Ginger',
	DarkGinger = 'Dark Ginger',
	Cream = 'Cream',
	Apricot = 'Apricot',

	Amber = 'Amber',
	LightAmber = 'Light Amber',

	Golden = 'Golden',
	Yellow = 'Yellow',

	Brown = 'Brown',
	DarkBrown = 'Dark Brown',
}

enum ColorpointColor {
	Black = 'Black',

	Gray = 'Gray',
	LightGray = 'Light Gray',
	DarkGrey = 'Dark Grey',

	Cream = 'Cream',

	Orange = 'Orange',
	Red = 'Red',
	Yellow = 'Yellow',
	Apricot = 'Apricot',

	Brown = 'Brown',
}

enum FurLength {
	Long = 'Long',
	Medium = 'Medium',
	Short = 'Short',
}

type PeltBase = {
	furLength?: FurLength;
};

type SolidColorPelt = {
	type: PeltType.SolidColor;

	color: PeltColor;
};

type BicolorPelt = {
	type: PeltType.Bicolor;

	color1: PeltColor;
	color2: PeltColor;
};

type TabbyPeltPattern = 'Mackerel' | 'Classic' | 'Spotted' | 'Ticked' | undefined;

type TabbyPelt = {
	type: PeltType.Tabby;

	color: PeltColor;
	tabbyPattern: TabbyPeltPattern;
};

type TortoiseshellPelt = {
	type: PeltType.Tortoiseshell;

	dilute: boolean;
	chimeraFace?: boolean;
};

type ColorpointPelt = {
	type: PeltType.Colorpoint;

	color: ColorpointColor;
};

type Pelt = PeltBase & (SolidColorPelt | BicolorPelt | TabbyPelt | TortoiseshellPelt | ColorpointPelt);

function randomizePelt(): Pelt {
	const peltTypeOdds: WeightedValue<PeltType>[] = [
		{ value: PeltType.Bicolor, probability: 0.2 },
		{ value: PeltType.Tabby, probability: 0.25 },
		{ value: PeltType.Tortoiseshell, probability: 0.15 },
		{ value: PeltType.Colorpoint, probability: 0.15 },
		{ value: PeltType.SolidColor, probability: '*' },
	];
	const peltType = randomUtils.pickRandomWeighted(peltTypeOdds);

	const furLengthOdds: WeightedValue<FurLength | undefined>[] = [
		{ value: FurLength.Long, probability: 0.166 },
		{ value: FurLength.Medium, probability: 0.166 },
		{ value: FurLength.Short, probability: 0.166 },
		{ value: undefined, probability: '*' },
	];
	const furLength = randomUtils.pickRandomWeighted(furLengthOdds);

	if (peltType === PeltType.SolidColor) {
		const randomPeltColor = Object.values(PeltColor)[Math.floor(Math.random() * Object.keys(PeltColor).length)];

		return { type: PeltType.SolidColor, furLength, color: randomPeltColor };
	} else if (peltType === PeltType.Bicolor) {
		const randomPeltColor1 = Object.values(PeltColor)[Math.floor(Math.random() * Object.keys(PeltColor).length)];
		let randomPeltColor2 = Object.values(PeltColor)[Math.floor(Math.random() * Object.keys(PeltColor).length)];

		while (
			randomPeltColor2 === randomPeltColor1 ||
			(randomPeltColor2.split(' ')[1] && randomPeltColor1.endsWith(` ${randomPeltColor2.split(' ')[1]}`))
		) {
			randomPeltColor2 = Object.values(PeltColor)[Math.floor(Math.random() * Object.keys(PeltColor).length)];
		}

		return { type: PeltType.Bicolor, furLength, color1: randomPeltColor1, color2: randomPeltColor2 };
	} else if (peltType === PeltType.Tabby) {
		const randomPeltColor = Object.values(PeltColor)[Math.floor(Math.random() * Object.keys(PeltColor).length)];

		const patternOdds: WeightedValue<TabbyPeltPattern>[] = [
			{ value: undefined, probability: 0.7 },
			{ value: 'Mackerel', probability: '*' },
			{ value: 'Classic', probability: '*' },
			{ value: 'Spotted', probability: '*' },
			{ value: 'Ticked', probability: '*' },
		];
		const pattern = randomUtils.pickRandomWeighted(patternOdds);

		return { type: PeltType.Tabby, furLength, color: randomPeltColor, tabbyPattern: pattern };
	} else if (peltType === PeltType.Tortoiseshell) {
		const diluteOdds: WeightedValue<boolean>[] = [
			{ value: true, probability: 0.33 },
			{ value: false, probability: '*' },
		];
		const isDilute = randomUtils.pickRandomWeighted(diluteOdds);

		const chimeraOdds: WeightedValue<boolean>[] = [
			{ value: true, probability: 0.005 },
			{ value: false, probability: '*' },
		];
		const isChimera = randomUtils.pickRandomWeighted(chimeraOdds);

		return {
			type: PeltType.Tortoiseshell,
			furLength,
			dilute: isDilute,
			chimeraFace: isChimera === false ? undefined : true,
		};
	} else if (peltType === PeltType.Colorpoint) {
		const randomColorpointColor =
			Object.values(ColorpointColor)[Math.floor(Math.random() * Object.keys(ColorpointColor).length)];

		return { type: PeltType.Colorpoint, furLength, color: randomColorpointColor };
	}

	return { type: PeltType.SolidColor, furLength, color: PeltColor.Gray };
}

function stringifyPelt(pelt: Pelt, long?: boolean): string {
	let peltString = '';

	if (long && pelt.furLength) {
		peltString += `${FurLength[pelt.furLength].toLowerCase()}hair `;
	}

	switch (pelt.type) {
		case PeltType.SolidColor:
			peltString += pelt.color.toLowerCase();
			break;

		case PeltType.Bicolor:
			peltString += `${pelt.color1.toLowerCase()} and ${pelt.color2.toLowerCase()}`;
			break;

		case PeltType.Tabby:
			if (!pelt.tabbyPattern) {
				peltString += `${pelt.color.toLowerCase()} tabby`;
			} else {
				peltString += `${pelt.color.toLowerCase()} ${pelt.tabbyPattern.toLowerCase()} tabby`;
			}
			break;

		case PeltType.Tortoiseshell:
			if (pelt.chimeraFace) {
				peltString += 'two-faced ';
			}

			if (pelt.dilute) {
				peltString += 'dilute tortoiseshell';
			} else {
				peltString += 'tortoiseshell';
			}
			break;

		case PeltType.Colorpoint:
			peltString += `${pelt.color.toLowerCase()} colorpoint`;
			break;

		default:
			return '';
	}

	return peltString;
}

export { PeltType, PeltColor, randomizePelt, stringifyPelt };
export type { Pelt };
