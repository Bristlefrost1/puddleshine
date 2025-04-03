import * as randomUtils from '@/utils/random-utils'
import { type WeightedValue } from '@/utils/random-utils'

export enum PeltType {
	SolidColour = 'SolidColour',
	SolidColor = 'SolidColor',
	Bicolour = 'Bicolour',
	Bicolor = 'Bicolor',
	Tabby = 'Tabby',
	Tortoiseshell = 'Tortoiseshell',
	Calico = 'Calico',
	Colourpoint = 'Colourpoint',
	Colorpoint = 'Colorpoint',
}

export enum PeltColour {
	White = 'White',
	Black = 'Black',

	Blue = 'Blue',

	Grey = 'Grey',
	LightGrey = 'Light Grey',
	DarkGrey = 'Dark Grey',
	PaleGrey = 'Pale Grey',
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

export enum ColourpointColour {
	Black = 'Black',

	Grey = 'Grey',
	LightGrey = 'Light Grey',
	DarkGrey = 'Dark Grey',

	Cream = 'Cream',

	Orange = 'Orange',
	Red = 'Red',
	Yellow = 'Yellow',
	Apricot = 'Apricot',

	Brown = 'Brown',
}

export enum FurLength {
	Long = 'Long',
	Medium = 'Medium',
	Short = 'Short',
}

type PeltBase = {
	furLength?: FurLength;
}

type SolidColourPelt = {
	type: PeltType.SolidColour | PeltType.SolidColor

	colour: PeltColour
}

type BicolourPelt = {
	type: PeltType.Bicolour | PeltType.Bicolor

	colour1: PeltColour
	colour2: PeltColour
}

type TabbyPeltPattern = 'Mackerel' | 'Classic' | 'Spotted' | 'Ticked' | undefined

type TabbyPelt = {
	type: PeltType.Tabby

	colour: PeltColour
	tabbyPattern: TabbyPeltPattern
}

type TortoiseshellPelt = {
	type: PeltType.Tortoiseshell

	dilute: boolean
	chimeraFace?: boolean
}

type CalicoPelt = {
	type: PeltType.Calico

	dilute: boolean
}

type ColourpointPelt = {
	type: PeltType.Colourpoint | PeltType.Colorpoint

	colour: ColourpointColour
}

export type Pelt = PeltBase & (SolidColourPelt | BicolourPelt | TabbyPelt | TortoiseshellPelt | CalicoPelt | ColourpointPelt)

export function randomisePelt(): Pelt {
	const peltTypeOdds: WeightedValue<PeltType>[] = [
		{ value: PeltType.Bicolour, probability: 0.2 },
		{ value: PeltType.Tabby, probability: 0.25 },
		{ value: PeltType.Tortoiseshell, probability: 0.1 },
		{ value: PeltType.Calico, probability: 0.1 },
		{ value: PeltType.Colourpoint, probability: 0.1 },
		{ value: PeltType.SolidColour, probability: '*' },
	]
	const peltType = randomUtils.pickRandomWeighted(peltTypeOdds)

	const furLengthOdds: WeightedValue<FurLength | undefined>[] = [
		{ value: FurLength.Long, probability: 0.166 },
		{ value: FurLength.Medium, probability: 0.166 },
		{ value: FurLength.Short, probability: 0.166 },
		{ value: undefined, probability: '*' },
	]
	const furLength = randomUtils.pickRandomWeighted(furLengthOdds)

	if (peltType === PeltType.SolidColour) {
		const randomPeltColour = Object.values(PeltColour)[Math.floor(Math.random() * Object.keys(PeltColour).length)]

		return { type: PeltType.SolidColour, furLength, colour: randomPeltColour }
	} else if (peltType === PeltType.Bicolour) {
		const randomPeltColour1 = Object.values(PeltColour)[Math.floor(Math.random() * Object.keys(PeltColour).length)]
		let randomPeltColour2 = Object.values(PeltColour)[Math.floor(Math.random() * Object.keys(PeltColour).length)]

		while (
			randomPeltColour2 === randomPeltColour1 ||
			(randomPeltColour2.split(' ')[1] && randomPeltColour1.endsWith(` ${randomPeltColour2.split(' ')[1]}`))
		) {
			randomPeltColour2 = Object.values(PeltColour)[Math.floor(Math.random() * Object.keys(PeltColour).length)]
		}

		return { type: PeltType.Bicolour, furLength, colour1: randomPeltColour1, colour2: randomPeltColour2 }
	} else if (peltType === PeltType.Tabby) {
		const randomPeltColour = Object.values(PeltColour)[Math.floor(Math.random() * Object.keys(PeltColour).length)]

		const patternOdds: WeightedValue<TabbyPeltPattern>[] = [
			{ value: undefined, probability: 0.7 },
			{ value: 'Mackerel', probability: '*' },
			{ value: 'Classic', probability: '*' },
			{ value: 'Spotted', probability: '*' },
			{ value: 'Ticked', probability: '*' },
		]
		const pattern = randomUtils.pickRandomWeighted(patternOdds)

		return { type: PeltType.Tabby, furLength, colour: randomPeltColour, tabbyPattern: pattern }
	} else if (peltType === PeltType.Tortoiseshell) {
		const diluteOdds: WeightedValue<boolean>[] = [
			{ value: true, probability: 0.33 },
			{ value: false, probability: '*' },
		]
		const isDilute = randomUtils.pickRandomWeighted(diluteOdds)

		const chimeraOdds: WeightedValue<boolean>[] = [
			{ value: true, probability: 0.005 },
			{ value: false, probability: '*' },
		]
		const isChimera = randomUtils.pickRandomWeighted(chimeraOdds)

		return {
			type: PeltType.Tortoiseshell,
			furLength,
			dilute: isDilute,
			chimeraFace: isChimera === false ? undefined : true,
		}
	} else if (peltType === PeltType.Colorpoint) {
		const randomColourpointColour =
			Object.values(ColourpointColour)[Math.floor(Math.random() * Object.keys(ColourpointColour).length)]

		return { type: PeltType.Colourpoint, furLength, colour: randomColourpointColour }
	} else if (peltType === PeltType.Calico) {
		const diluteOdds: WeightedValue<boolean>[] = [
			{ value: true, probability: 0.33 },
			{ value: false, probability: '*' },
		]
		const isDilute = randomUtils.pickRandomWeighted(diluteOdds)

		return { type: PeltType.Calico, furLength, dilute: isDilute }
	}

	return { type: PeltType.SolidColour, furLength, colour: PeltColour.Grey }
}

export function stringifyPelt(pelt: Pelt, long?: boolean): string {
	let peltString = ''

	if (long && pelt.furLength) {
		peltString += `${FurLength[pelt.furLength].toLowerCase()}hair `
	}

	switch (pelt.type) {
		case PeltType.SolidColor:
		case PeltType.SolidColour:
			if (typeof (pelt as any).color === 'string') {
				peltString += ((pelt as any).color as string).toLowerCase()
			} else {
				peltString += pelt.colour.toLowerCase()
			}
			
			break

		case PeltType.Bicolor:
		case PeltType.Bicolour:
			if (typeof (pelt as any).color1 === 'string') {
				peltString += (pelt as any).color1.toLowerCase()
			} else {
				peltString += pelt.colour1.toLowerCase()
			}

			peltString += ' and '

			if (typeof (pelt as any).color2 === 'string') {
				peltString += (pelt as any).color2.toLowerCase()
			} else {
				peltString += pelt.colour2.toLowerCase()
			}

			break

		case PeltType.Tabby:
			if (typeof (pelt as any).color === 'string') {
				peltString += ((pelt as any).color as string).toLowerCase()
			} else {
				peltString += pelt.colour.toLowerCase()
			}

			if (!pelt.tabbyPattern) {
				peltString += ` tabby`
			} else {
				peltString += ` ${pelt.tabbyPattern.toLowerCase()} tabby`
			}

			break

		case PeltType.Tortoiseshell:
			if (pelt.chimeraFace) {
				peltString += 'two-faced '
			}

			if (pelt.dilute) {
				peltString += 'dilute tortoiseshell'
			} else {
				peltString += 'tortoiseshell'
			}

			break

		case PeltType.Calico:
			if (pelt.dilute) {
				peltString += 'dilute calico'
			} else {
				peltString += 'calico'
			}

			break

		case PeltType.Colorpoint:
		case PeltType.Colourpoint:
			if (typeof (pelt as any).color === 'string') {
				peltString += ((pelt as any).color as string).toLowerCase()
			} else {
				peltString += pelt.colour.toLowerCase()
			}

			peltString += ` colourpoint`

			break

		default:
			return ''
	}

	return peltString
}
