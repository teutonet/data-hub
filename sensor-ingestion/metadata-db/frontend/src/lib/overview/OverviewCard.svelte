<script lang="ts">
	import Title from '$lib/Title.svelte';
	import { Badge, Card, P } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import type { Component } from 'svelte';
	import { twMerge } from 'tailwind-merge';
	import ExternalLinkIcon from '~icons/heroicons/arrow-top-right-on-square';

	interface Props {
		href: string;
		externalLink?: boolean; // true when link should be opened in new tab -> _blank | adds icon
		title: string;
		description?: string;
		disabled?: boolean;
		badgeLabel?: string;
		Icon?: Component;
	}

	let {
		href,
		externalLink = false,
		title,
		description,
		disabled = false,
		badgeLabel,
		Icon
	}: Props = $props();

	const disabledCardClass = $derived(disabled ? 'cursor-not-allowed opacity-50' : '');
	const cardClass = $derived('h-full max-w-full');
	const reactiveHref = $derived(disabled ? undefined : href);
</script>

<div class="p-0 pe-4 pt-4 md:w-full lg:w-1/2">
	<Card
		class={twMerge(cardClass, disabledCardClass)}
		href={reactiveHref}
		{title}
		{...{ target: externalLink ? '_blank' : undefined }}
	>
		<div class="flex flex-row items-center justify-between">
			<div>
				<div class="mb-3 flex flex-col items-center md:flex-row lg:flex-col xl:flex-row">
					<Title headingClass="max-w-fit" type="Heading" {title} />
					{#if externalLink}
						<ExternalLinkIcon class="ms-1 h-5 w-5 text-black dark:text-white" />
					{/if}
					{#if badgeLabel}
						<Badge rounded color="primary" class="mt-1 ml-0 md:ml-3 lg:ml-0 xl:ml-3"
							>{badgeLabel}</Badge
						>
					{/if}
				</div>
				<P>{$_(description ?? '')}</P>
			</div>
			{#if Icon}
				<Icon class="ms-1 h-15 w-15 text-black dark:text-white" />
			{/if}
		</div>
	</Card>
</div>
