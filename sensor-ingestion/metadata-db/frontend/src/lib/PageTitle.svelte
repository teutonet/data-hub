<script lang="ts">
	import { Heading } from 'flowbite-svelte';
	import { twMerge } from 'tailwind-merge';
	interface Props {
		title: string;
		headingClass?: string | null;
		headingTag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
	}

	let { title, headingClass = null, headingTag = 'h1' }: Props = $props();

	let classHeading = $derived(twMerge('mb-4', headingClass));
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<Heading
	tag={headingTag}
	class={classHeading}
	customSize="text-4xl font-extrabold  md:text-5xl lg:text-6xl"
>
	{title}
</Heading>
