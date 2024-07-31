const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	entry: './src/index.ts',
	mode: 'production',
	target: 'node20',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: path.resolve(__dirname, 'node_modules', '.prisma', 'client', 'query_engine_bg.wasm'),
				},
			],
		}),
	],
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
		alias: {
			'.prisma/client/default': path.resolve(__dirname, './node_modules/.prisma/client/wasm.js'),
			'#': path.resolve(__dirname, './src'),
			'#cards': path.resolve(__dirname, './cards'),
		},
	},
	externalsType: 'module',
	externals: {
		'./query_engine_bg.wasm': './query_engine_bg.wasm',
		crypto: 'node:crypto',
		util: 'node:util',
	},
	externalsPresets: {
		node: true,
	},
	output: {
		filename: 'worker.mjs',
		chunkFormat: 'module',
		asyncChunks: false,

		environment: {
			module: true,
			nodePrefixForCoreModules: true,
		},

		path: path.resolve(__dirname, 'dist', 'worker'),
		library: {
			type: 'module',
		},
	},
	devtool: false,
	experiments: {
		asyncWebAssembly: true,
		outputModule: true,
	},
};
