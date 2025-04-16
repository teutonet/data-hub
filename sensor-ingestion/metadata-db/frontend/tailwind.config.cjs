const plugin = require('tailwindcss/plugin');

const config = {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
	],

	plugins: [
		require('flowbite/plugin'),

		//workaround for flowbite-svelte still using tailwind 2 *facepalm
		// this basically adds back the missing class bg-opacity
		plugin(function ({ theme, matchUtilities }) {
			const opacities = theme('opacity'); // Get the opacity theme values from Tailwind

			matchUtilities(
				{
					'bg-opacity': (value) => ({
						backgroundColor: `rgba(0, 0, 0, ${value})` // Create the background color opacity utility
					})
				},
				{ values: opacities, type: 'value' } // Apply the values from the opacity theme
			);
		})
	],

	darkMode: 'selector'
};

module.exports = config;
