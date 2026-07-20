import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	redirect(308, url.pathname.split('/').slice(0, -1).join('/'));
};
