<script lang="ts">
    import MapPinHouse from '@lucide/svelte/icons/map-pin-house';
	import type { AddressFeature } from '$lib/store/directoryStoreInterface';

type SelectOption = {value: AddressFeature, label: string};

let { addressFeature = $bindable(), addressOptions, visible = $bindable(), disableFetch = $bindable() } :{ addressFeature: AddressFeature|undefined; addressOptions: SelectOption[]; visible: boolean; disableFetch: boolean } = $props();
</script>

<div class="flex flex-wrap gap-2 w-full">
{#each addressOptions as addressOption}
<button class="chip variant-soft hover:variant-filled" onclick={()=>{disableFetch=true; addressFeature = addressOption.value; visible=false;}}>
	<span><MapPinHouse/></span>
	<span>{addressOption.label}</span>
</button>
{/each}
</div>