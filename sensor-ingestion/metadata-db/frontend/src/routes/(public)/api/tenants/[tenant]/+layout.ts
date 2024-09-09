import type { LayoutLoad } from './$types';

export const load: LayoutLoad<{ tenant: string }> = ({ params }) => {
	return { tenant: params.tenant };
};
