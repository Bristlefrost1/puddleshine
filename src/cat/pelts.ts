import * as randomUtils from '#utils/random-utils.js';

import type { WeightedValue } from '#utils/random-utils.js';

enum PeltType {
	SolidColor = 'SolidColor',
	Tabby = 'Tabby',
}

enum PeltColor {
	White = 'White',
	Silver = 'Silver',
	Gray = 'Gray',
	PaleGray = 'Pale Gray',
	Black = 'Black',
	Cream = 'Cream',
	PaleGinger = 'Pale Ginger',
	Ginger = 'Ginger',
	Golden = 'Golden',
	Yellow = 'Yellow',
	Brown = 'Brown',
	GoldenBrown = 'Golden-Brown',
	DarkBrown = 'Dark Brown',
}

type PeltBase = {
	furLength?: string;
};

type SolidColorPelt = {
	type: PeltType.SolidColor;

	color: PeltColor;
};

type TabbyPeltPattern = 'Mackerel' | 'Classic' | 'Spotted' | 'Ticked' | undefined;

type TabbyPelt = {
	type: PeltType.Tabby;

	color: PeltColor;
	tabbyPattern: TabbyPeltPattern;
};

type Pelt = PeltBase & (SolidColorPelt | TabbyPelt);

function randomizePelt(): Pelt {
	const peltColorIndex = Math.floor(Math.random() * Object.keys(PeltColor).length);
	const randomPeltColor = Object.values(PeltColor)[peltColorIndex];

	const tabbyOdds: WeightedValue<boolean>[] = [
		{ value: true, probability: 0.5 },
		{ value: false, probability: '*' },
	];

	const isTabby = randomUtils.pickRandomWeighted(tabbyOdds);

	if (isTabby) {
		const patternOdds: WeightedValue<TabbyPeltPattern>[] = [
			{ value: undefined, probability: 0.7 },
			{ value: 'Mackerel', probability: '*' },
			{ value: 'Classic', probability: '*' },
			{ value: 'Spotted', probability: '*' },
			{ value: 'Ticked', probability: '*' },
		];

		const pattern = randomUtils.pickRandomWeighted(patternOdds);

		return { type: PeltType.Tabby, color: randomPeltColor, tabbyPattern: pattern };
	} else {
		return { type: PeltType.SolidColor, color: randomPeltColor };
	}
}

function stringifyPelt(pelt: Pelt): string {
	switch (pelt.type) {
		case PeltType.SolidColor:
			return pelt.color.toLowerCase();

		case PeltType.Tabby:
			if (!pelt.tabbyPattern) return `${pelt.color.toLowerCase()} tabby`;

			return `${pelt.color.toLowerCase()} ${pelt.tabbyPattern} tabby`;

		default:
			return '';
	}
}

export { PeltType, PeltColor, randomizePelt, stringifyPelt };
export type { Pelt };
