import de from './de.json';
import { addMessages, init } from 'svelte-i18n';

addMessages('de', de);

export function startClient(): void {
	void init({
		fallbackLocale: 'de',
		initialLocale: 'de'
	});
}
