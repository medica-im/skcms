<script lang="ts">
import { ProgressRadial } from '@skeletonlabs/skeleton';
import * as m from "$msgs";
import { reactiveQueryArgs } from '$lib/utils/utils.svelte';
import { createQuery } from '@tanstack/svelte-query';
import FacilityCard from '$lib/Facility/FacilityCardDisplay.svelte';
import { getFacility } from '$lib/Web/data';
import type { FacilityV2, Commune } from '$lib/interfaces/v2/facility.ts';

let { facilityUid, showEffectors } : {facilityUid: string; showEffectors: boolean } = $props();

async function fetchFacility(): Promise<FacilityV2 | number> {
		const response = await fetch(`/api/v2/facilities/${facilityUid}`);
		if (response.ok) {
			return await response.json();
		} else {
			return response.status;
		}
	}
/*
const facilityStore = createQuery(
    reactiveQueryArgs(()=> ({
				queryKey: ['facility', facilityUid],
				queryFn: () => getFacility(facilityUid)
			}))
        );
let { error, isLoading, isRefetching, data } = $derived($facilityStore);
*/
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
        {@const facility = value }
<FacilityCard data={facility} {showEffectors} />
{/if}
	{:catch error}
		<p>Erreur {error.message}</p>
	{/await}
{/if}
