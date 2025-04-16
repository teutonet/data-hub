import { date, time } from 'svelte-i18n';
import { derived } from 'svelte/store';

export const formatDatetime = derived(
	[date, time],
	([date, time]) =>
		(rawDate: string | null | undefined): string => {
			if (!rawDate) {
				return '';
			} else {
				const asDate = new Date(rawDate);
				return `${date(asDate, { format: 'medium' })} ${time(asDate)}`;
			}
		}
);

export const formatDate = derived(date, (date) => (rawDate: string | null | undefined): string => {
	if (!rawDate) {
		return '';
	} else {
		const asDate = new Date(rawDate);
		return date(asDate, { format: 'medium' });
	}
});
