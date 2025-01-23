<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { Button } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { _ } from 'svelte-i18n';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const group: string = data.group;
</script>

<PageTitle title={group} />

<div class="flex flex-col gap-1">
	<Button href={`${group}/permissions`} class="mt-4">
		{$_('page.groupsList.permissionListTitle')}
	</Button>
</div>
