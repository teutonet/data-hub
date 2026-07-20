import type { LayoutLoad } from './$types';

export const load: LayoutLoad<{ tenant: string; vizGroup: string }> = ({ params }) => {
	return { tenant: params.tenant, vizGroup: params.vizGroup };
};
