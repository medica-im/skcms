<script lang="ts">
	import Directory from '$lib/components/Directory/CtxDirectory.svelte';
	import MapSvelte from '$lib/components/Map/Map.svelte';
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

	function lgGridCols() {
		if (facility?.avatar?.raw) {
			return '3';
		} else {
			return '2';
		}
	}
</script>

<div class="grid grid-cols-1 md:flex md:flex-wrap lg:grid-cols-{lgGridCols()} gap-8 w-full mx-auto justify-items-center lg:justify-items-stretch self-items-center ">
	<div class="space-y-4 mx-auto lg:w-{lgGridCols()=='2' ? '1/2' : '1/3'}">
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
		<div class="lg:max-w-{lgGridCols()=='2' ? 'lg' : 'sm'}">
			<Directory
				data={entries}
				typesView={true}
				propSelectFacility={facility.uid}
				displayEntries={true}
				propCurrentOrg={null}
			/>
		</div>
	</div>
	{#if facility?.avatar?.raw}
		<div class="mx-auto lg:w-1/3">
			<figure class="content-center shrink mx-auto w-64 lg:w-80">
				<img
					class="h-auto w-fit"
					src="{variables.BASE_URI}{facility.avatar.raw}"
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
	{#if facility.address.longitude && facility.address.latitude}
		<div class="h-64 w-64 lg:w-96 lg:h-96 z-0 mx-auto lg:w-{lgGridCols()=='2' ? '1/2' : '1/3'}">
			<MapSvelte data={createFacilitiesMapData([facility])} />
		</div>
	{/if}
</div>
