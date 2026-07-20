import { writable } from 'svelte/store';

export const activeProjectId = writable<string>('all');

export enum SelectMode {
	Global,
	SingleProject
}

export function getMode(activeProjectId: string) {
	if (activeProjectId == 'all') {
		return SelectMode.Global;
	} else return SelectMode.SingleProject;
}
