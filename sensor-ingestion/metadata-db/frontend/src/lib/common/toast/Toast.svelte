<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { ToastOptions, ToastStyle } from './toast';
	import CloseIcon from '~icons/heroicons/x-mark';
	import { _ } from 'svelte-i18n';

	export let close: () => void;
	export let toast: ToastOptions;
	const delay = { short: 2000, normal: 5000, long: 20000 }[toast.duration ?? 'normal'];
	const color = styleToColor(toast.style ?? 'info');
	function styleToColor(style: ToastStyle): string {
		switch (style) {
			case 'success':
				return 'green';
			case 'info':
				return 'blue';
			case 'warning':
				return 'yellow';
			case 'danger':
				return 'red';
		}
	}

	if (toast.duration !== 'indefinite') setTimeout(close, delay);
</script>

<div
	transition:slide
	class="toast show bg-{color}-600 m-2 rounded border-2 text-white border-{color}-600"
	role="alert"
	aria-live="assertive"
	aria-atomic="true"
>
	<div class="flex p-2">
		<strong class="me-auto">{$_(toast.message)}</strong>
		<button type="button" class="btn-close align-self-start flex-shrink-0" on:click={close}>
			<CloseIcon />
			<span class="sr-only">{$_('shared.action.close')}</span>
		</button>
	</div>
	{#if toast.detail}
		<div class="text-newlines rounded bg-white p-2 text-black">
			{$_(toast.detail, { values: toast.detailValues })}
		</div>
	{/if}
</div>

<style>
	.no-detail {
		border-radius: calc(-1px + 0.25rem);
		border-bottom: none;
	}
</style>
