import * as randomUtils from '#utils/random-utils.js';

import type { WeightedValue } from '#utils/random-utils.js';

enum EyesType {
	Normal = 'Normal',
	Heterochromia = 'Heterochromia',
}

enum EyeColor {
	Blue = 'Blue',
	DarkBlue = 'Dark Blue',
	Cyan = 'Cyan',
	Teal = 'Teal',
	PaleBlue = 'Pale Blue',
	Gray = 'Gray',
	Yellow = 'Yellow',
	Amber = 'Amber',
	PaleYellow = 'Pale Yellow',
	Golden = 'Golden',
	Green = 'Green',
	Emerald = 'Emerald',
	PaleGreen = 'Pale Green',
}

type NormalEyes = {
	type: EyesType.Normal;

	eyeColor: EyeColor;
};

type HeterochromicEyes = {
	type: EyesType.Heterochromia;

	leftEyeColor: EyeColor;
	rightEyeColor: EyeColor;
};

type Eyes = NormalEyes | HeterochromicEyes;

function randomizeEyes(): Eyes {
	const heterochromiaOdds: WeightedValue<boolean>[] = [
		{ value: true, probability: 0.005 },
		{ value: false, probability: '*' },
	];

	const hasHeterochromia = randomUtils.pickRandomWeighted(heterochromiaOdds);

	if (hasHeterochromia) {
		const leftIndex = Math.floor(Math.random() * Object.keys(EyeColor).length);
		let rightIndex = Math.floor(Math.random() * Object.keys(EyeColor).length);

		while (rightIndex === leftIndex) {
			rightIndex = Math.floor(Math.random() * Object.keys(EyeColor).length);
		}

		const leftEyeColor = Object.values(EyeColor)[leftIndex];
		const rightEyeColor = Object.values(EyeColor)[rightIndex];

		return {
			type: EyesType.Heterochromia,
			leftEyeColor,
			rightEyeColor,
		};
	} else {
		const eyeColorIndex = Math.floor(Math.random() * Object.keys(EyeColor).length);
		const randomEyeColor = Object.values(EyeColor)[eyeColorIndex];

		return {
			type: EyesType.Normal,
			eyeColor: randomEyeColor,
		};
	}
}

function stringifyEyes(eyes: Eyes): string {
	switch (eyes.type) {
		case EyesType.Normal:
			return `${eyes.eyeColor.toLowerCase()} eyes`;
		case EyesType.Heterochromia:
			return `${eyes.leftEyeColor.toLowerCase()} left & ${eyes.rightEyeColor.toLowerCase()} right eye`;
		default:
			return '';
	}
}

export { EyesType, EyeColor, randomizeEyes, stringifyEyes };
export type { Eyes };
