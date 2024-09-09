<script lang="ts">
	import L, { LatLng, type LatLngExpression } from 'leaflet';
	import { createIcon } from './utils';
	import { Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';

	export let latSensor: number | null;
	export let lngSensor: number | null;
	export let sensorName: string;
	const initialView: LatLngExpression = { lat: latSensor ?? 0, lng: lngSensor ?? 0 };

	let map: L.Map;
	let markerLayers: L.LayerGroup = L.layerGroup();
	let initalMarker: L.Marker;
	let changeMarker: L.Marker | null = null;
	let mouseDownCenter: LatLng;
	let openMap: boolean;

	function getMouseDownCenter() {
		mouseDownCenter = map.getCenter();
	}
	function updateMouseManual(latSensor: number | null, lngSensor: number | null) {
		if (latSensor && lngSensor && map) {
			if (changeMarker) {
				changeMarker.remove();
			}
			changeMarker = createMarker({ lat: latSensor, lng: lngSensor });
			changeMarker.addTo(markerLayers).setIcon(createIcon('text-orange-600'));
		}
	}
	$: updateMouseManual(latSensor, lngSensor);

	function createMarker(loc: LatLngExpression) {
		let marker = L.marker(loc)
			.bindPopup(sensorName)
			.on('click', clickZoom)
			.setIcon(createIcon('text-slate-700'));
		return marker;
	}
	function createMap(container: HTMLDivElement) {
		map = L.map(container, { preferCanvas: true, center: initialView }).setView(
			initialView,
			latSensor && lngSensor ? 19 : 1
		);

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 19
		}).addTo(map);
	}
	function mapAction(container: HTMLDivElement) {
		createMap(container);

		if (latSensor && lngSensor) {
			initalMarker = createMarker(initialView);
			markerLayers.addLayer(initalMarker);
		}
		markerLayers.addTo(map);

		return {
			destroy: () => {
				map ? map.remove() : null;
			}
		};
	}

	function resizeMap() {
		if (map) {
			map.invalidateSize();
		}
	}

	// invalidateSize() runs into race condition if map div is not yet initialized. can we use onMount here?
	setTimeout(function () {
		resizeMap();
	}, 100);
	function clickZoom(e: any) {
		map?.setView(e.target?.getLatLng(), 5);
	}
	function mouseClick(e: MouseEvent) {
		let center = map.getCenter();
		let mousePos = map.mouseEventToLatLng(e);
		if (center.lat === mouseDownCenter.lat && center.lng === mouseDownCenter.lng) {
			if (changeMarker) {
				changeMarker.remove();
			}
			changeMarker = createMarker(mousePos);
			changeMarker.addTo(markerLayers).setIcon(createIcon('text-orange-600'));
			latSensor = mousePos.lat;
			lngSensor = mousePos.lng;
		}
	}
</script>

<svelte:window on:resize={resizeMap} />
{#if openMap}
	<div
		class="map z-10 h-[600px] min-h-[600px] w-[600px] min-w-[600px] rounded-xl"
		use:mapAction
		aria-label="Map"
		role="presentation"
		on:mousedown={getMouseDownCenter}
		on:click={mouseClick}
	/>
{:else}
	<div
		class="map z-10 mx-auto flex h-[600px] min-h-[600px] w-[600px] min-w-[600px] items-center justify-center rounded-xl bg-slate-300"
	>
		<div class="mx-auto my-auto h-[600px] w-1/2 pt-[45%] text-center align-middle">
			<Button on:click={() => (openMap = true)}>{$_('component.map.openMap')}</Button>
		</div>
	</div>
{/if}
