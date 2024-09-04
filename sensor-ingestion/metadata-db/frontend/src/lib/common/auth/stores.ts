import { derived, writable } from 'svelte/store';
import type { UserProfile } from 'oidc-client-ts';

export interface ExtendedTokenClaims extends UserProfile {
	projects: string[];
}

export interface ErrorMessage {
	msgKey: string;
	srcMsg: string;
}

export const isAuthenticated = writable<boolean>(false);
export const accessToken = writable<string>('');
export const errorMessage = writable<ErrorMessage | null>(null);
export const profile = writable<ExtendedTokenClaims | null>(null);
export const projectAccess = derived(
	profile,
	(profile) => profile?.projects?.slice()?.sort() ?? []
);
