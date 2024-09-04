import type { PageLoad } from './$types';

export const load: PageLoad<{ propertyId: string }> = ({ params }) => {
	return { propertyId: params.propertyId };
};
