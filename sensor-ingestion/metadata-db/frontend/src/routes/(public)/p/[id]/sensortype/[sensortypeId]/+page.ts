import type { PageLoad } from './$types';

export const load: PageLoad<{ sensortypeId: string }> = ({ params }) => {
	return {
		sensortypeId: params.sensortypeId
	};
};
