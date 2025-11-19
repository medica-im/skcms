<script lang="ts">
	import { page } from '$app/state';
	import { language } from '$lib/store/languageStore';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Fa from 'svelte-fa';
	import { faEnvelope } from '@fortawesome/free-regular-svg-icons';
	import {
		faGlobe,
		faCircleNodes,
		faPhone,
		faMapLocationDot,
		faPenToSquare,
		faCopy,
	} from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import Emails from '$lib/Email/Emails.svelte';
	import Phones from '$lib/Directory/Phone/Phones.svelte';
	import Address from '$lib/Directory/Address.svelte';
	import Websites from '$lib/Website/Websites.svelte';
	import { Map } from '$lib';
	import { createMapData } from '$lib';
	import SoMed from '$lib/SoMed/SoMed.svelte';
	import Appointment from '$lib/components/Effector/Appointment/Appointments.svelte';
	import Cost from '$lib/components/Effector/Cost/Cost.svelte';
	import Payment from '$lib/Addressbook/Payment/Payment.svelte';
	import { FacilityLink } from '$lib';
	import Info from '$lib/components/Effector/Info/Info.svelte';
	import AvatarList from '$lib/components/Effector/Avatar/Avatar.svelte';
	import Back from '$lib/components/Directory/Back.svelte';
	import Switch from '$lib/Switch/Switch.svelte';
	import CreatePhone from '$lib/Web/Phone/CreatePhone.svelte';
	import CreateEmail from '$lib/Web/Email/Create.svelte';
	import CreateWebsite from '$lib/Web/Website/Create.svelte';
	import UpdateEffector from '$lib/Web/Effector/UpdateEffectorModal.svelte';
	import InactivateEntry from '$lib/Web/Entry/InactivateEntry.svelte';
	import { copy } from 'svelte-copy';
	import { setEditMode, getEditMode, setEntryUid, setEffectorUid } from './context';
	import { hyphenateUuid } from '$lib/utils/utils';
	import UuidHex from '$lib/Uuid/UuidHex.svelte';
	import UuidHyphen from '$lib/Uuid/UuidHyphen.svelte';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let { data } : { data: EntryFull } = $props();


	setEntryUid(data.uid);
	setEffectorUid(data.effector_uid);
	setEditMode();
	const editMode = getEditMode();

	const isSuperUser = $derived(page.data?.user?.role == 'superuser');
</script>

<svelte:head>
	<title>
		{data.name} - {capitalizeFirstLetter(page.data.organization.formatted_name, $language)}
	</title>
</svelte:head>
<div class="grid grid-cols-1 justify-center space-y-4">
	{#if page?.data?.session}
		<div
			id="sticky-banner"
			tabindex="-1"
			class="sticky top-0 right-10 w-full flex justify-end z-100"
		>
			<Switch icon={faPenToSquare} />
		</div>
	{/if}

	<div class="flex flex-wrap p-2 gap-10">
		<div class="space-y-2">
			{#if isSuperUser}
				entry {data?.uid}
				<UuidHex data={data?.uid}/>
				<UuidHyphen data={data?.uid}/>
			{/if}
			<h2 class="h2 flex flex-initial break-words overflow-hidden place-items-center gap-4">{data.name}{#if $editMode}<UpdateEffector {data}/>{/if}</h2>
			{#if isSuperUser}
				effector {data?.effector_uid}
				<UuidHex data={data?.effector_uid}/>
				<UuidHyphen data={data?.effector_uid}/>
			{/if}
			<h3 class="h3 italic">{data?.effector_type?.label}</h3>
			{#if isSuperUser}
				type {data?.effector_type?.uid}
				<UuidHex data={data?.effector_type?.uid}/>
				<UuidHyphen data={data?.effector_type?.uid}/>
			{/if}

			<FacilityLink data={data.facility} />
			{#if isSuperUser}
			facility {data?.facility?.uid}
			<UuidHex data={data?.facility?.uid}/>
			<UuidHyphen data={data?.facility?.uid}/>
			{/if}
			
		</div>
		<div class="flex-none">
			{#if data?.avatar}
				<AvatarList {data} />
			{/if}
		</div>
	</div>
	<div class="grid grid-cols-1 lg:grid-cols-1 p-2 gap-4">
		{#if data?.appointments?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<Appointment data={data.appointments} />
			</div>
		{/if}
		{#if data.phones?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center py-2">
					<div class="w-9"><Fa icon={faPhone} size="sm" /></div>
					<div>
						<h3 class="h3 flex place-items-center gap-1">{capitalizeFirstLetter(m.PHONE())} {#if $editMode}<CreatePhone entry={data.uid}/>{/if}</h3>
						
					</div>
				</div>
				<div class="flex items-center p-1">
					<div class="w-9"></div>
					<div class="py-2 space-x-2">
						<Phones data={data.phones} />
					</div>
				</div>
			</div>
		{/if}
		{#if data.emails?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center py-2">
					<div class="w-9"><Fa icon={faEnvelope} size="sm" /></div>
					<div>
						<h3 class="h3 flex place-items-center gap-1">Email{#if $editMode}<CreateEmail entry={data.uid}/>{/if}</h3>
					</div>
				</div>
				<div class="flex">
					<div class="w-9"></div>
					<div class="py-2">
						<Emails data={data.emails} editMode={$editMode} />
					</div>
				</div>
			</div>
		{/if}

		{#if data?.convention || data?.carte_vitale != null || data?.third_party_payers || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<Cost {data} />
			</div>
		{/if}
			{#if data.payment_methods != null || $editMode}
				<div class="d-flex justify-content-between align-items-start">
					<Payment data={data.payment_methods} editMode={$editMode} />
				</div>
			{/if}
		{#if data.websites?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center p-1">
					<div class="w-9"><Fa icon={faGlobe} size="sm" /></div>
					<div>
						<h3 class="h3 flex place-items-center gap-1">Web{#if $editMode}<CreateWebsite entry={data.uid}/>{/if}</h3>
					</div>
				</div>
				{#if data.websites}
				<div class="flex p-1">
					<div class="w-9"></div>
					<div class="p-1 space-x-2">
						<Websites data={data.websites} />
					</div>
				</div>
				{/if}
			</div>
		{/if}
		{#if data.socialnetworks?.length}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center p-1">
					<div class="w-9"><Fa icon={faCircleNodes} /></div>
					<div>
						<h3 class="h3">{m.ADDRESSBOOK_SOMED()}</h3>
					</div>
				</div>
				<div class="flex p-1">
					<div class="w-9"></div>
					<div class="p-1 space-x-2">
						<SoMed data={data.socialnetworks} appBar={false} />
					</div>
				</div>
			</div>
		{/if}
		{#if data?.spoken_languages || data?.rpps || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<Info {data} />
			</div>
		{/if}
	</div>
	{#if data.address}
		<div class="px-2">
			<div class="flex items-center p-1">
				<div class="w-9"><Fa icon={faMapLocationDot} size="sm" /></div>
				<div>
					<h3 class="h3">{capitalizeFirstLetter(m.ADDRESSBOOK_LOCATION())}</h3>
				</div>
			</div>
			<div class="flex p-1">
				<div class="w-9"></div>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-1">
					<div class="space-y-2">
						<FacilityLink data={data.facility} />
						<Address data={data.address} distance={false} />
					</div>
					{#if data.address.longitude && data.address.latitude}
						<div class="h-56 w-64 lg:h-64 lg:w-96 p-2 z-0">
							<Map data={createMapData(data.address, data.facility.name)} />
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
	{#if $editMode}
	<div class="flex flex-row">
	<InactivateEntry/>
	</div>
	{/if}
	<div class="flex flex-row-reverse">
		<Back />
	</div>
</div>
