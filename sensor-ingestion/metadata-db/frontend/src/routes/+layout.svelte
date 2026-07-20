<script lang="ts">
	import '../app.css';
	import 'leaflet/dist/leaflet.css';
	import { startClient } from '$lib/common/i18n';
	import ToastList from '$lib/common/toast/ToastList.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	startClient();
</script>

{@render children?.()}
<ToastList />
