/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
	root: true,
	extends: ['@remix-run/eslint-config', '@remix-run/eslint-config/node', '@remix-run/eslint-config/jest-testing-library', 'prettier'],
	globals: {
		shopify: 'readonly',
		browser: true,
	},
	rules: {
		'react/react-in-jsx-scope': 'off',
		'react/jsx-uses-react': 'off',
		'no-unused-vars': 'warn',
	},
};
