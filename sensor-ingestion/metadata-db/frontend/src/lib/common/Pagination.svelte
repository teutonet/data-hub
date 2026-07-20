<script lang="ts">
	import { Button, ButtonGroup } from 'flowbite-svelte';
	import ChevronLeftIcon from '~icons/heroicons/chevron-left';
	import ChevronRightIcon from '~icons/heroicons/chevron-right';

	interface Props {
		pageCount: number;
		currentPage: number;
		previous: () => void;
		next: () => void;
	}

	let { pageCount = $bindable(), currentPage = $bindable(), previous, next }: Props = $props();
</script>

<ButtonGroup size="sm">
	<Button class="bg-grey-100 dark:bg-gray-600" on:click={previous}>
		<ChevronLeftIcon />
	</Button>
	{#each Array(pageCount) as _, i (i)}
		<Button
			class="bg-grey-100 cursor-pointer dark:bg-gray-600"
			on:click={() => {
				currentPage = i + 1;
			}}
			disabled={i + 1 === currentPage}
		>
			{i + 1}
		</Button>
	{/each}
	<Button class="bg-grey-100 dark:bg-gray-600" on:click={next}>
		<ChevronRightIcon />
	</Button>
</ButtonGroup>
