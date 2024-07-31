/*
 * clan-names.ts
 *
 * A utility for generating and validating clan names
 *
 */

import clanNames from '#resources/clan/names.json' assert { type: 'json' };

/**
 * Checks if the specified string is a valid Clan name
 *
 * @param name The name to be validated
 * @returns Whether or not the name is a valid clan name
 */
function validateName(name: string): boolean {
	const possiblePrefixes = clanNames.prefixes.filter((prefix) => name.toLowerCase().startsWith(prefix.toLowerCase()));
	const possibleSuffixes = clanNames.suffixes.filter((suffix) => name.toLowerCase().endsWith(suffix.toLowerCase()));

	if (possiblePrefixes.length === 0 || possibleSuffixes.length === 0) return false;

	for (const prefix of possiblePrefixes) {
		for (const suffix of possibleSuffixes) {
			if (prefix.toLowerCase() + suffix.toLowerCase() === name.toLowerCase()) return true;
		}
	}

	return false;
}

function generateRandomName(): string {
	const randomPrefix = clanNames.prefixes[Math.floor(Math.random() * clanNames.prefixes.length)];
	const randomSuffix = clanNames.suffixes[Math.floor(Math.random() * clanNames.suffixes.length)];

	return randomPrefix + randomSuffix;
}

export { validateName, generateRandomName };
