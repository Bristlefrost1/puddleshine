import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

import eslintConfigPrettier from 'eslint-config-prettier';
import bristlefrostConfig from '@bristlefrost/eslint-config';

export default [
	...bristlefrostConfig,
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: tsParser,
		},
		plugins: {
			tsPlugin,
		},
	},
	eslintConfigPrettier,
];
