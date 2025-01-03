import type { LayoutLoad } from './$types';

export const load: LayoutLoad<{ tenant: string; group: string }> = ({ params }) => {
	return { tenant: params.tenant, group: params.group };
};
