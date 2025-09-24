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
	import Phones from '$lib/Directory/Phones.svelte';
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
	import { copy } from 'svelte-copy';
	import { setEditMode, getEditMode, setEntryUid, setEffectorUid } from './context';
	import { hyphenateUuid } from '$lib/utils/utils';
	import UuidHex from '$lib/Uuid/UuidHex.svelte';
	import UuidHyphen from '$lib/Uuid/UuidHyphen.svelte';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let { data } = $props();

	let entry: EntryFull = $derived(data.entry);

	setEntryUid(data.entry.uid);
	setEffectorUid(data.entry.effector_uid);
	setEditMode();
	const editMode = getEditMode();

	const isSuperUser = $derived(page.data?.user?.role == 'superuser');
</script>

<svelte:head>
	<title>
		{entry.name} - {capitalizeFirstLetter(page.data.organization.formatted_name, $language)}
	</title>
</svelte:head>
<div class="grid grid-col-1 justify-center space-y-4">
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
				entry {entry?.uid}
				<UuidHex data={entry?.uid}/>
				<UuidHyphen data={entry?.uid}/>
			{/if}
			<h2 class="h2 flex-initial break-words overflow-hidden">{entry.name}</h2>
			{#if isSuperUser}
				effector {entry?.effector_uid}
				<UuidHex data={entry?.effector_uid}/>
				<UuidHyphen data={entry?.effector_uid}/>
			{/if}
			<h3 class="h3 italic">{entry?.effector_type?.label}</h3>
			{#if isSuperUser}
				type {entry?.effector_type?.uid}
				<UuidHex data={entry?.effector_type?.uid}/>
				<UuidHyphen data={entry?.effector_type?.uid}/>
			{/if}

			<FacilityLink data={entry.facility} />
			{#if isSuperUser}
			facility {entry?.facility?.uid}
			<UuidHex data={entry?.facility?.uid}/>
			<UuidHyphen data={entry?.facility?.uid}/>
			{/if}
			
		</div>
		<div class="flex-none">
			{#if entry?.avatar}
				<AvatarList data={entry} />
			{/if}
		</div>
	</div>
	<div class="grid grid-col-1 lg:grid-cols-1 p-2 gap-4">
		{#if entry?.appointments?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<Appointment data={entry.appointments} />
			</div>
		{/if}
		{#if entry.phones?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center py-2">
					<div class="w-9"><Fa icon={faPhone} size="sm" /></div>
					<div>
						<h3 class="h3 flex place-items-center gap-1">{capitalizeFirstLetter(m.PHONE())} {#if $editMode}<CreatePhone entry={entry.uid}/>{/if}</h3>
						
					</div>
				</div>
				<div class="flex items-center p-1">
					<div class="w-9"></div>
					<div class="py-2 space-x-2">
						<Phones data={entry.phones} />
					</div>
				</div>
			</div>
		{/if}
		{#if entry.emails?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center py-2">
					<div class="w-9"><Fa icon={faEnvelope} size="sm" /></div>
					<div>
						<h3 class="h3 flex place-items-center gap-1">Email{#if $editMode}<CreateEmail entry={entry.uid}/>{/if}</h3>
					</div>
				</div>
				<div class="flex">
					<div class="w-9"></div>
					<div class="py-2">
						<Emails data={entry.emails} editMode={$editMode} />
					</div>
				</div>
			</div>
		{/if}

		{#if entry?.convention || entry?.carte_vitale != null || entry?.third_party_payers || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<Cost data={entry} />
			</div>
		{/if}
			{#if entry.payment_methods != null || $editMode}
				<div class="d-flex justify-content-between align-items-start">
					<Payment data={entry.payment_methods} editMode={$editMode} />
				</div>
			{/if}
		{#if entry.websites?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center p-1">
					<div class="w-9"><Fa icon={faGlobe} size="sm" /></div>
					<div>
						<h3 class="h3 flex place-items-center gap-1">Web{#if $editMode}<CreateWebsite entry={entry.uid}/>{/if}</h3>
					</div>
				</div>
				{#if entry.websites}
				<div class="flex p-1">
					<div class="w-9"></div>
					<div class="p-1 space-x-2">
						<Websites data={entry.websites} />
					</div>
				</div>
				{/if}
			</div>
		{/if}
		{#if entry.socialnetworks?.length}
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
						<SoMed data={entry.socialnetworks} appBar={false} />
					</div>
				</div>
			</div>
		{/if}
		{#if entry?.spoken_languages || entry?.rpps || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<Info data={entry} />
			</div>
		{/if}
	</div>
	{#if entry.address}
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
						<FacilityLink data={entry.facility} />
						<Address data={entry.address} distance={false} />
					</div>
					{#if entry.address.longitude && entry.address.latitude}
						<div class="h-56 w-64 lg:h-64 lg:w-96 p-2 z-0">
							<Map data={createMapData(entry.address, entry.facility.name)} />
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<div class="flex flex-row-reverse">
		<Back />
	</div>
</div>
