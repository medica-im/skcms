<script lang="ts">
    import MapPinHouse from '@lucide/svelte/icons/map-pin-house';
	import type { AddressFeature } from '$lib/store/directoryStoreInterface';

type SelectOption = {value: AddressFeature, label: string};

let { addressFeature = $bindable(), addressOptions = $bindable(), visible = $bindable() } :{ addressFeature: AddressFeature|null; addressOptions: SelectOption[]; visible: boolean; } = $props();
</script>

<div class="flex flex-wrap gap-2 w-full">
{#each addressOptions as addressOption}
<button class="chip variant-soft hover:variant-filled" onclick={()=>{addressFeature = addressOption.value; addressOptions.length=0;}}>
	<span><MapPinHouse/></span>
	<span>{addressOption.label}</span>
</button>
{/each}
</div>