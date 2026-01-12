<script lang="ts">
	import { language } from '$lib/store/languageStore.ts';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import FacilityPage from '$lib/Facility/FacilityPage.svelte';
	import SitesLink from '$lib/components/Sites/SitesLink.svelte';
	import { page } from '$app/state';
	import UpdateFacilityModal from '$lib/Web/Facility/UpdateFacilityModal.svelte';
	import Back from '$lib/components/Directory/Back.svelte';
	import type { FacilityV2 } from '$lib/interfaces/v2/facility.ts';
	import type { Facility } from '$lib/interfaces/facility.interface';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let dataV2 = $derived(data.facility ? getFacilityV2(data.facility) : undefined);
	function getFacilityV2(facility: Facility): FacilityV2 {
		let location = null;
		const latitude = facility.address.latitude;
		const longitude = facility.address.longitude;
		if (latitude && longitude) {
			location = {
				latitude: parseFloat(latitude),
				longitude: parseFloat(longitude)
			};
		}
		return {
			uid: facility.uid,
			commune: {
				name_fr: facility.address.city,
				uid: '',
				slug_fr: '',
				wikidata: '',
				department: {
					uid: '',
					name: '',
					code: '',
					slug: '',
					wikidata: ''
				}
			},
			updated: 0,
			name: facility.name,
			label: facility.label,
			slug: facility.slug,
			location: location,
			zoom: facility.address.zoom,
			building: facility.address.building,
			street: facility.address.street,
			geographical_complement: facility.address.geographical_complement,
			zip: facility.address.zip,
			effectors: null,
			ban_id: null,
			ban_banId: null
		};
	}

</script>

<svelte:head>
	<title>
		{data.facility?.name} - {capitalizeFirstLetter(
			page.data.organization.formatted_name,
			$language
		)}
	</title>
</svelte:head>

<header id="hero" class="bg-surface-100-800-token hero-gradient">
	<div class="mx-0 flex flex-col items-center justify-center p-4 py-6">
		<h2 class="h2">{data.facility?.name}</h2>
	</div>
</header>
{#if page?.data?.session && dataV2}
	<div id="sticky-banner" tabindex="-1" class="sticky top-0 right-10 w-full flex justify-end z-100">
		<UpdateFacilityModal facility={dataV2} />
	</div>
{/if}
<div class="mx-0 flex flex-col items-center justify-center p-4 py-6">
	<div class="grid grid-cols-1 w-full gap-4 mx-auto justify-items-center">
		<FacilityPage facility={data.facility} entries={data.entryMap} />
		<SitesLink />
		<Back />
	</div>
</div>

<style lang="postcss">
	.section-container {
		@apply p-4 py-8;
	}
	/* Hero Gradient */
	/* prettier-ignore */
	.hero-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 98% 1%, rgba(var(--color-error-500) / 0.33) 0px, transparent 50%);
	}
</style>
