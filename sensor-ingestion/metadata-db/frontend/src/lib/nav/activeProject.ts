import { writable } from 'svelte/store';

export const activeProjectId = writable<string | undefined>(undefined);
