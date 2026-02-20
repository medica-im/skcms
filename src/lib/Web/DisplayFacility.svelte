<script lang="ts">
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import * as m from '$msgs';
	import FacilityCard from '$lib/Facility/FacilityCardDisplay.svelte';
	import type { FacilityV2, Commune } from '$lib/interfaces/v2/facility.ts';
	import { page } from '$app/state';

	let {
		facilityUid,
		showEffectors,
		mapHeight = 64,
		update = page.data.user?.role === 'superuser'
	}: { facilityUid: string; showEffectors: boolean; mapHeight?: number; update?: boolean } = $props();

	async function fetchFacility(): Promise<FacilityV2 | number> {
		const response = await fetch(`/api/v2/facilities/${facilityUid}`);
		if (response.ok) {
			return await response.json();
		} else {
			return response.status;
		}
	}
</script>

<!--{#if isLoading}
<span>{m.LOADING}</span>
{:else if error}
<span>{m.ERROR}: {error.message}</span>
{:else if data}
<FacilityCard data={data} {showEffectors} />
{/if}-->

{#if facilityUid}
	{#await fetchFacility()}
		<ProgressRadial />
	{:then value}
		{#if typeof value == 'number'}
			{@const status = value}
			<p>Erreur {status}</p>
		{:else}
			{@const facility = value}
			<FacilityCard data={facility} {showEffectors} {mapHeight} {update} anchor={false} />
		{/if}
	{:catch error}
		<p>Erreur {error.message}</p>
	{/await}
{/if}
