<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { onMount } from 'svelte';
	import { mousePosStore } from './utils';
	import { _ } from 'svelte-i18n';

	interface Props {
		mapDiv: HTMLDivElement | undefined;
	}

	let { mapDiv }: Props = $props();

	let posX = $state(0);
	let posY = $state(0);
	let isVisible = $state(false);
	let isProtected = $state(false);
	let copyButtonText = $derived(`${$mousePosStore[0]}, ${$mousePosStore[1]}`);

	onMount(async () => {
		while (!mapDiv) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		mapDiv.addEventListener('mousedown', (e) => {
			if (e.button == 2) {
				posX = e.clientX + window.pageXOffset;
				posY = e.clientY + window.pageYOffset;
				isVisible = true;
			} else if (!isProtected) {
				isVisible = false;
			}
		});
	});

	function copyButtonFunction() {
		navigator.clipboard.writeText(copyButtonText);
	}
</script>

<Button
	class="z-11 rounded-none bg-gray-200 text-black hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
	hidden={!isVisible}
	style="position: absolute; top: {posY}px; left: {posX}px;"
	on:click={copyButtonFunction}
	on:mouseenter={() => (isProtected = true)}
	on:mouseleave={() => (isProtected = false)}
	oncontextmenu={(e: Event) => e.preventDefault()}
>
	{$_('sensorView.map.copy')}
	{copyButtonText}
</Button>

<svelte:window onclick={() => (isVisible = false)} />
