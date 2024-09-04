import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';

export type ToastStyle = 'success' | 'info' | 'warning' | 'danger';
export type ToastDuration = 'short' | 'normal' | 'long' | 'indefinite';

export interface ToastOptions {
	/** "This kind of thing happened". e.g. "Server created", "Invitation received" */
	message: string;
	// no message detail
	/** "Instance X", "X invited you to Y" */
	detail?: string;
	detailValues?: Record<string, string | number | Date>;
	duration?: ToastDuration;
	style?: ToastStyle;
}

export type ToastStore = Writable<ToastOptions[]>;
export const globalToastStore: ToastStore = writable<ToastOptions[]>([]);

export function create(toast: ToastOptions, toastStore = globalToastStore): void {
	toastStore.update((toasts) => {
		return [...toasts, toast];
	});
}

function toastFunction(duration: ToastDuration, style: ToastStyle) {
	return (
		message: ToastOptions['message'],
		detail?: ToastOptions['detail'],
		detailValues?: ToastOptions['detailValues'],
		toastStore = globalToastStore
	) => create({ message, detail, detailValues, duration, style }, toastStore);
}

export const success = toastFunction('short', 'success');
export const info = toastFunction('normal', 'info');
export const warning = toastFunction('normal', 'warning');
export const error = toastFunction('long', 'danger');
export const critical = toastFunction('indefinite', 'danger');
