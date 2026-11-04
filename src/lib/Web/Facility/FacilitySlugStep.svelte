<script lang="ts">
	import * as m from '$msgs';
	import SlugField from '$lib/Web/Facility/SlugField.svelte';
	import type { FacilityV2 } from '$lib/interfaces/v2/facility.ts';

	let {
		facilityUid,
		effectorType,
		effector,
		needed = $bindable(false),
		ok = $bindable(false)
	}: {
		facilityUid: string;
		effectorType: string | undefined;
		effector: string | undefined;
		/** The facility has no address yet, so one is chosen with the entry. */
		needed?: boolean;
		/** The address shown is one the server said is free. */
		ok?: boolean;
	} = $props();

	async function fetchFacility(uid: string): Promise<FacilityV2 | null> {
		const response = await fetch(`/api/v2/facilities/${uid}`);
		return response.ok ? await response.json() : null;
	}

	const facility = $derived(await fetchFacility(facilityUid));
	let slug = $state('');

	$effect(() => {
		needed = !!facility && !facility.slug;
	});
</script>

{#if facility && !facility.slug}
	<div class="space-y-2 w-full" data-testid="facility-slug-step">
		<span class="font-medium">{m.FACILITY_SLUG_STEP_LABEL()}</span>
		<p class="opacity-80">{m.FACILITY_SLUG_STEP_HELP()}</p>
		<SlugField
			name={facility.name ?? ''}
			commune={facility.commune.name_fr}
			street={facility.street}
			zip={facility.zip ?? ''}
			{effectorType}
			{effector}
			exclude={facility.uid}
			bind:slug
			bind:ok
		/>
		<input type="hidden" name="facility_slug" value={slug} />
	</div>
{/if}
