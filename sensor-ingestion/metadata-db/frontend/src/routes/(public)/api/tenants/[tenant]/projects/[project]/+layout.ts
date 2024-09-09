import type { LayoutLoad } from './$types';

export const load: LayoutLoad<{ tenant: string; project: string }> = ({ params }) => {
	return { tenant: params.tenant, project: params.project };
};
