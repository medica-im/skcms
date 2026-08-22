<script lang="ts">
	import { base } from '$app/paths';
	import Types from '$lib/components/Directory/Types.svelte';
	import MapLibre from '$lib/MapLibre/MapLibre.svelte';
	import Address from '$lib/Address/Address.svelte';
	import Navigation from '$lib/Navigation/Navigation.svelte';
	import Email from '$lib/Email/Email.svelte';
	import SoMed from '$lib/SoMed/SoMed.svelte';
	import Website from '$lib/components/Website/Website.svelte';
	import { browser } from '$app/environment';
	import { isMobile } from '$lib/helpers/deviceDetector';
	import { createFacilitiesMapData } from '$lib/components/Map/mapData';
	import { variables } from '$lib/utils/constants';
	import { copy } from 'svelte-copy';
	import { page } from '$app/state';
	import UuidHex from '$lib/Uuid/UuidHex.svelte';
	import UuidHyphen from '$lib/Uuid/UuidHyphen.svelte';
	import type { Facility } from '$lib/interfaces/facility.interface.ts';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	import { PUBLIC_URL } from '$lib/utils/appUrl';

	export let facility: Facility;
	export let entries: Map<any, any>;

	const createFacilityGeoData = (facility: Facility) => {
		let address = facility?.address;
		let facilityGeoData = {
			name: facility?.name ?? 'default',
			latitude: Number(address?.latitude ?? 0),
			longitude: Number(address?.longitude ?? 0),
			zoom: address?.zoom ?? 0
		};
		return facilityGeoData;
	};

	// The column count used to be computed here and interpolated into class
	// names, which Tailwind cannot see at build time. The row is now a flex
	// layout whose items share the space evenly, so the count is implicit:
	// whichever of the three columns exist divide the row between them.
</script>

<!--
	A flex row from lg up, with each column given a basis rather than a width:
	`gap-8` sits between the items, so three thirds would overflow and the
	columns would overlap. `flex-1` lets them share what the gaps leave over.
-->
<div
	class="flex flex-col lg:flex-row lg:flex-nowrap gap-8 w-full mx-auto items-center lg:items-start"
>
	<div class="space-y-4 w-full max-w-lg lg:max-w-none lg:flex-1 lg:min-w-0">
		<Address data={facility} />
		{#if facility?.emails}
			{#each facility?.emails as email}
				<Email data={email} />
			{/each}
		{/if}
		{#if facility.address.longitude && facility.address.latitude}
			{#if browser}
				{#if isMobile(window)}
					<Navigation geoData={createFacilityGeoData(facility)} />
				{/if}
			{/if}
		{/if}
		{#if facility?.websites || facility?.socialnetworks}
			<span class="inline-block align-middle space-x-1">
				{#if facility?.websites}
					{#each facility.websites as website}
						<Website {website} />
					{/each}
				{/if}
				{#if facility?.socialnetworks}
					<SoMed data={facility.socialnetworks} appBar={false} />
				{/if}
			</span>
		{/if}
		{#if page.data?.user?.role == 'superuser'}
			<div class="space-x-2">
				<span>Facility {facility.uid}</span>
				<UuidHex data={facility.uid}/>
				<UuidHyphen data={facility.uid}/>
			</div>
		{/if}
		<div class="w-full">
			<Types
				data={entries}
				displayEntries={true}
			/>
		</div>
	</div>
	<!--
		The photograph of the place, shown to every visitor: it is what lets a
		patient recognize the building on arrival. Wide (16:9) on purpose — the
		square frame below belongs to personal avatars and would crop the facade.
	-->
	{#if facility?.image?.lg || facility?.image?.raw}
		<!--
			The row is a flex container from md up (md:flex overrides the grid),
			so items size to their content unless given a width. Hence the
			explicit basis rather than leaving it to a grid track.
		-->
		<div class="mx-auto w-full max-w-lg lg:max-w-none lg:flex-1 lg:min-w-0">
			<!--
				Fills its share of the row rather than sitting at the avatar's
				fixed 320px: a wide photograph of a building is unreadable at
				that size. The aspect ratio is pinned so the row keeps its
				height while the image loads.
			-->
			<figure class="mx-auto w-full">
				<img
					class="w-full h-auto aspect-video object-cover rounded-container-token"
					src="{PUBLIC_URL}{facility.image.lg ?? facility.image.raw}"
					alt={facility.image.alt || facility.name}
				/>
				<figcaption class="text-center w-full">
					<div class="mx-auto text-primary">
						{facility.name}
					</div>
				</figcaption>
			</figure>
		</div>
	{:else if facility?.avatar?.raw}
		<div class="mx-auto w-full max-w-lg lg:max-w-none lg:flex-1 lg:min-w-0">
			<!-- Square, so it keeps its modest fixed size inside the column. -->
			<figure class="content-center shrink mx-auto w-64 lg:w-80">
				<img
					class="h-auto w-fit"
					src="{PUBLIC_URL}{facility.avatar.raw}"
					alt={facility.name}
				/>
				<figcaption class="text-center w-64 lg:w-80">
					<div class="mx-auto text-primary">
						{facility.name}
					</div>
				</figcaption>
			</figure>
		</div>
	{/if}
	<!--
		The map fills its column instead of sitting at a fixed 384px: on a wide
		screen that left ~200px of the column empty, and because the element was
		also centred the leftover showed up as an outsized gap next to the
		photograph. Height stays fixed — only the width follows the column.
	-->
	{#if facility.address.longitude && facility.address.latitude}
		<div class="h-64 lg:h-96 z-0 mx-auto w-full max-w-lg lg:max-w-none lg:flex-1 lg:min-w-0">
			<MapLibre data={createFacilitiesMapData([facility])} showTooltip={false} target={null} />
		</div>
	{/if}
</div>
