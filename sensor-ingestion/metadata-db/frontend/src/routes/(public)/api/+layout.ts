import type { LayoutLoad } from './$types';

export const load: LayoutLoad<{
	tenant: string;
	group: string;
	project: string;
	vizGroup: string;
}> = ({ params }) => {
	return {
		tenant: params.tenant ? params.tenant : '',
		group: params.group ? params.group : '',
		project: params.project ? params.project : '',
		vizGroup: params.vizGroup ? params.vizGroup : ''
	};
};
