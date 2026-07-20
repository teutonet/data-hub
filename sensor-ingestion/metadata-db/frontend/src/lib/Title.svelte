<!-- Use this Component for all smaller Titles and Subtitles, use PageTitle for the Overarching Title of the Page i.e. "Overview", "Berechtigungsverwaltung" -->

<script lang="ts">
	import { Heading } from 'flowbite-svelte';
	import { twMerge } from 'tailwind-merge';
	interface Props {
		title: string;
		headingClass?: string | null;
		type: 'PageTitle' | 'SubTitle' | 'Heading' | 'SmallHeading';
	}
	let titleStyle = {
		PageTitle: 'text-4xl',
		SubTitle: 'text-2xl',
		Heading: 'text-xl',
		SmallHeading: 'text-lg'
	};
	let { type = 'PageTitle', title, headingClass = null }: Props = $props();
</script>

<Heading class={headingClass} customSize={twMerge(titleStyle[type], 'font-bold')}>
	{title}
</Heading>
