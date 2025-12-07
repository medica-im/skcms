<script lang="ts">
	import { getGeoInputAddress } from '$lib/components/Directory/context.ts';
	import MapPinHouse from '@lucide/svelte/icons/map-pin-house';
	import type { AddressFeature } from '$lib/store/directoryStoreInterface';

	type SelectOption = { value: AddressFeature; label: string };

	let {
		addressFeature = $bindable(),
		addressOptions = $bindable(),
		commune = null
	}: {
		addressFeature: AddressFeature | null;
		addressOptions: SelectOption[];
		commune?: string | null;
	} = $props();

	let inputAddress = getGeoInputAddress();

	function onClick(addressOption: SelectOption) {
		addressFeature = addressOption.value;
		if (addressFeature) {
			if (commune) {
				$inputAddress = addressFeature.properties.name;
			} else {
				const city = `[${addressFeature.properties.city}]`;
				$inputAddress = `${addressFeature.properties.name} ${city}`;
			}
		}
	}
</script>

<div class="flex flex-wrap gap-2 w-full">
	{#each addressOptions as addressOption}
		<button class="chip variant-soft hover:variant-filled" onclick={() => onClick(addressOption)}>
			<span><MapPinHouse /></span>
			<span>{addressOption.label}</span>
		</button>
	{/each}
</div>
