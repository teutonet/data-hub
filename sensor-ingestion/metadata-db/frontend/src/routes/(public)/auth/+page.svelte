<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	// This route is only internally used by $lib/common/auth/Auth.svelte
	// and Auth.svelte should redirect away from this page on its own.
	// If the page is accidentally rendered, we can redirect to the root page.

	if (browser) {
		void goto('/overview', { replaceState: true });
	}
</script>
