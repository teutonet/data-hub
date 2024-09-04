<script lang="ts">
	import '../app.pcss';
	import 'leaflet/dist/leaflet.css';
	import { startClient } from '$lib/common/i18n';
	import ToastList from '$lib/common/toast/ToastList.svelte';

	startClient();
</script>

<slot />
<ToastList />
