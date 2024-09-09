import type { LayoutLoad } from './$types';

export const load: LayoutLoad<{ permission: string }> = ({ params }) => {
	return { permission: params.permission };
};
