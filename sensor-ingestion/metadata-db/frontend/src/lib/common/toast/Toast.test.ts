import { fireEvent, render } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';
import { globalToastStore, success, type ToastDuration, type ToastOptions } from './toast';
import Toast from './Toast.svelte';
import ToastList from './ToastList.svelte';

function testToast(duration?: ToastDuration, detail?: boolean): ToastOptions {
	return {
		message: 'page.overview.invitations',
		...(detail ? { detail: 'page.overview.invitationsCount' } : {}),
		duration,
		detailValues: {
			count: 5
		}
	};
}

function renderToast({
	close = () => undefined,
	duration = undefined,
	detail = true
}: {
	close?: () => void;
	duration?: ToastDuration;
	detail?: boolean;
} = {}) {
	const toast = testToast(duration, detail);
	const toastStore = writable([toast]);

	return {
		...render(Toast, { props: { toast, close: close } }),
		toast,
		toastStore
	};
}

beforeEach(() => {
	vi.useFakeTimers();
});

describe('Toast', () => {
	test('shows the translated message and detail', () => {
		const { getByText } = renderToast();

		expect(getByText('Invitations')).toBeInTheDocument();
		expect(getByText('You have 5 invitations')).toBeInTheDocument();
	});

	test('can be shown without detail', () => {
		const { getByText } = renderToast({ detail: false });

		expect(getByText('Invitations')).toBeInTheDocument();
	});

	test('closes/removes itself automatically', () => {
		const close = vi.fn();
		renderToast({ close });

		vi.runAllTimers();
		expect(close).toHaveBeenCalledTimes(1);
	});

	test('does not close with indefinite duration', () => {
		const close = vi.fn();
		renderToast({
			close,
			duration: 'indefinite'
		});

		vi.runAllTimers();
		expect(close).not.toHaveBeenCalled();
	});

	test('closes by clicking the close button', async () => {
		const close = vi.fn();
		const { getByText } = renderToast({
			close,
			duration: 'indefinite'
		});

		await fireEvent.click(getByText('Close'));
		expect(close).toHaveBeenCalledTimes(1);
	});
});

function renderToastList(toasts?: ToastOptions[]) {
	const toastStore = writable(toasts);

	return {
		...render(ToastList, toasts ? { props: { toasts: toastStore } } : {}),
		toastStore
	};
}

describe('ToastList', () => {
	test('shows toasts', () => {
		const { getAllByText } = renderToastList([testToast(), testToast()]);
		expect(getAllByText('Invitations')).toHaveLength(2);
	});

	test('removes closed toasts from the store', () => {
		success('page.overview.invitations');
		const { getByText } = renderToastList();
		expect(getByText('Invitations')).toBeInTheDocument();

		vi.runAllTimers();
		expect(get(globalToastStore)).toHaveLength(0);
	});

	test('to default to the global toast store', () => {
		success('page.overview.invitations');
		const { getByText } = renderToastList();
		expect(getByText('Invitations')).toBeInTheDocument();
	});
});
