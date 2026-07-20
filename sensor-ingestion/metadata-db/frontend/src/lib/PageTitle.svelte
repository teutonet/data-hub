<script lang="ts">
	import Title from './Title.svelte';
	interface Props {
		title: string;
	}
	let { title }: Props = $props();
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<Title type="PageTitle" {title} headingClass="mb-4"></Title>
