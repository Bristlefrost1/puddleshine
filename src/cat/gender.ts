export enum Gender {
	Tom = 'Tom',
	SheCat = 'She-cat',
	Other = '',
}

export enum KitGender {
	TomKit = 'Tom-kit',
	SheKit = 'She-kit',
	Other = '',
}

export type Pronouns = {
	subject: string
	subjectU: string

	object: string
	objectU: string

	possessive: string
	possessiveU: string

	reflexive: string
	reflexiveU: string
}

const nonBinary: Pronouns = {
	subject: 'they',
	subjectU: 'They',

	object: 'them',
	objectU: 'Them',

	possessive: 'their',
	possessiveU: 'Their',

	reflexive: 'themselves',
	reflexiveU: 'Themselves',
}

const masculine: Pronouns = {
	subject: 'he',
	subjectU: 'He',

	object: 'him',
	objectU: 'him',

	possessive: 'his',
	possessiveU: 'his',

	reflexive: 'himself',
	reflexiveU: 'himself',
}

const feminine: Pronouns = {
	subject: 'she',
	subjectU: 'She',

	object: 'her',
	objectU: 'Her',

	possessive: 'her',
	possessiveU: 'Her',

	reflexive: 'herself',
	reflexiveU: 'Herself',
}

export function getPronouns(gender?: Gender | KitGender): Pronouns {
	if (!gender) return nonBinary

	switch (gender) {
		case Gender.Tom:
		case KitGender.TomKit:
			return masculine

		case Gender.SheCat:
		case KitGender.SheKit:
			return feminine

		default:
			return nonBinary
	}
}
