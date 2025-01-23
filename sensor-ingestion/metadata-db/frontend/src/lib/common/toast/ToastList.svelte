<script lang="ts">
	import type { Writable } from 'svelte/store';
	import { globalToastStore } from './toast';
	import type { ToastOptions } from './toast';
	import Toast from './Toast.svelte';

	function removeToast(toast: ToastOptions) {
		toasts.update((toasts) => toasts.filter((t) => t !== toast));
	}

	interface Props {
		toasts?: Writable<ToastOptions[]>;
	}

	let { toasts = globalToastStore }: Props = $props();
</script>

<div class="fixed bottom-0 left-1/2 z-50 w-96 -translate-x-1/2 p-3">
	<div class="flex flex-col content-center gap-1">
		{#each $toasts as toast (toast)}
			<Toast close={() => removeToast(toast)} {toast} />
		{/each}
	</div>
</div>
