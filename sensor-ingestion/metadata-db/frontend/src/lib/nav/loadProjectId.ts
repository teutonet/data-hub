import type { LayoutLoad } from '../../routes/(public)/p/[id]/$types';
import { activeProjectId } from './activeProject';

export const loadProjectIdFromUrl: LayoutLoad<{ projectId: string }> = ({ params }) => {
	const id = params.id;

	activeProjectId.set(id);

	return {
		projectId: id
	};
};
