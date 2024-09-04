import type { PageLoad } from './$types';

export const load: PageLoad<{ sensorId: string; id: string }> = ({ params }) => {
	return { sensorId: params.sensorId, id: params.id };
};
