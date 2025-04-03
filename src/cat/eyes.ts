import * as randomUtils from '@/utils/random-utils'
import { type WeightedValue } from '@/utils/random-utils'

export enum EyesType {
	Normal = 'Normal',
	Heterochromia = 'Heterochromia',
}

export enum EyeColour {
	Blue = 'Blue',
	DarkBlue = 'Dark Blue',
	Cyan = 'Cyan',
	Teal = 'Teal',
	PaleBlue = 'Pale Blue',
	Lavender = 'Lavender',
	Grey = 'Grey',
	Yellow = 'Yellow',
	Amber = 'Amber',
	PaleYellow = 'Pale Yellow',
	Golden = 'Golden',
	Copper = 'Copper',
	Green = 'Green',
	Emerald = 'Emerald',
	PaleGreen = 'Pale Green',
}

export type NormalEyes = {
	type: EyesType.Normal

	eyeColour: EyeColour
}

export type HeterochromicEyes = {
	type: EyesType.Heterochromia

	leftEyeColour: EyeColour
	rightEyeColour: EyeColour
}

export type Eyes = NormalEyes | HeterochromicEyes

export function randomiseEyes(): Eyes {
	const heterochromiaOdds: WeightedValue<boolean>[] = [
		{ value: true, probability: 0.025 },
		{ value: false, probability: '*' },
	]

	const hasHeterochromia = randomUtils.pickRandomWeighted(heterochromiaOdds)

	if (hasHeterochromia) {
		const leftIndex = Math.floor(Math.random() * Object.keys(EyeColour).length)
		let rightIndex = Math.floor(Math.random() * Object.keys(EyeColour).length)

		while (rightIndex === leftIndex) {
			rightIndex = Math.floor(Math.random() * Object.keys(EyeColour).length)
		}

		const leftEyeColour = Object.values(EyeColour)[leftIndex]
		const rightEyeColour = Object.values(EyeColour)[rightIndex]

		return {
			type: EyesType.Heterochromia,
			leftEyeColour: leftEyeColour,
			rightEyeColour: rightEyeColour,
		}
	} else {
		const eyeColorIndex = Math.floor(Math.random() * Object.keys(EyeColour).length)
		const randomEyeColour = Object.values(EyeColour)[eyeColorIndex]

		return {
			type: EyesType.Normal,
			eyeColour: randomEyeColour,
		}
	}
}

export function stringifyEyes(eyes: Eyes): string {
	switch (eyes.type) {
		case EyesType.Normal:
			if ((eyes as any).eyeColor !== undefined)
				return `${(eyes as unknown as { eyeColor: string }).eyeColor.toLowerCase()} eyes`

			return `${eyes.eyeColour.toLowerCase()} eyes`

		case EyesType.Heterochromia:
			if ((eyes as any).leftEyeColor !== undefined)
				return `${(eyes as any).leftEyeColor.toLowerCase()} left & ${(eyes as any).rightEyeColor.toLowerCase()} right eye`

			return `${eyes.leftEyeColour.toLowerCase()} left & ${eyes.rightEyeColour.toLowerCase()} right eye`

		default:
			return ''
	}
}
