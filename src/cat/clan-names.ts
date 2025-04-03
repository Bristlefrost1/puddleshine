/*
 * clan-names.ts
 *
 * A utility for generating and validating clan names
 *
 */

import clanNames from './clan-names.json'

export const prefixes = clanNames.prefixes
export const suffixes = clanNames.suffixes

/**
 * Checks if the specified string is a valid Clan name
 *
 * @param name The name to be validated
 * @returns Whether or not the name is a valid clan name
 */
export function validateName(name: string): boolean {
	const possiblePrefixes = clanNames.prefixes.filter((prefix) => name.toLowerCase().startsWith(prefix.toLowerCase()))
	const possibleSuffixes = clanNames.suffixes.filter((suffix) => name.toLowerCase().endsWith(suffix.toLowerCase()))

	if (possiblePrefixes.length === 0 || possibleSuffixes.length === 0) return false

	for (const prefix of possiblePrefixes) {
		for (const suffix of possibleSuffixes) {
			if (prefix.toLowerCase() + suffix.toLowerCase() === name.toLowerCase()) return true
		}
	}

	return false
}

export function generateRandomPrefix(): string {
	return clanNames.prefixes[Math.floor(Math.random() * clanNames.prefixes.length)]
}

export function generateRandomSuffix(options?: { historyPromote?: boolean }): string {
	let randomSuffix = clanNames.suffixes[Math.floor(Math.random() * clanNames.suffixes.length)]

	if (options && options.historyPromote) {
		while (randomSuffix.toLowerCase() === 'paw' || randomSuffix.toLowerCase() === 'kit' || randomSuffix.toLowerCase() === 'star') {
			randomSuffix = clanNames.suffixes[Math.floor(Math.random() * clanNames.suffixes.length)]
		}
	}

	return randomSuffix
}

export function generateRandomName(): string {
	const randomPrefix = generateRandomPrefix()
	const randomSuffix = generateRandomSuffix()

	return randomPrefix + randomSuffix
}
