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
		faPeopleGroup,
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
	import Membership from '$lib/Membership/Membership.svelte';
	import PatchMembershipModal from '$lib/Web/Entry/Membership/PatchMembershipModal.svelte';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	interface EntryComponent {
		fullentry: EntryFull,
		memberships: Entry[]
	};

	let { data } = $props();

let fullentry = $derived(data.fullentry);
let memberships = $derived(data.memberships);

	setEntryUid(fullentry.uid);
	setEffectorUid(fullentry.effector_uid);
	setEditMode();
	const editMode = getEditMode();

	const isSuperUser = $derived(page.data?.user?.role == 'superuser');
</script>

<svelte:head>
	<title>
		{fullentry.name} - {capitalizeFirstLetter(page.data.organization.formatted_name, $language)}
	</title>
</svelte:head>
<div class="grid grid-cols-1 space-y-4">
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
			{#if isSuperUser && $editMode}
				entry {fullentry?.uid}
				<UuidHex data={fullentry?.uid}/>
				<UuidHyphen data={fullentry?.uid}/>
			{/if}
			<h2 class="h2 flex flex-initial break-words overflow-hidden place-items-center gap-4">{fullentry.name}{#if $editMode}<UpdateEffector data={fullentry}/>{/if}</h2>
			{#if isSuperUser && $editMode}
				effector {fullentry?.effector_uid}
				<UuidHex data={fullentry?.effector_uid}/>
				<UuidHyphen data={fullentry?.effector_uid}/>
			{/if}
			<h3 class="h3 italic">{fullentry?.effector_type?.label}</h3>
			{#if isSuperUser && $editMode}
				type {fullentry?.effector_type?.uid}
				<UuidHex data={fullentry?.effector_type?.uid}/>
				<UuidHyphen data={fullentry?.effector_type?.uid}/>
			{/if}

			<FacilityLink data={fullentry.facility} />
			{#if isSuperUser && $editMode}
			facility {fullentry?.facility?.uid}
			<UuidHex data={fullentry?.facility?.uid}/>
			<UuidHyphen data={fullentry?.facility?.uid}/>
			{/if}
			
		</div>
		<div class="flex-none">
			{#if fullentry?.avatar}
				<AvatarList data={fullentry} />
			{/if}
		</div>
	</div>
	<div class="grid grid-cols-1 lg:grid-cols-1 p-2 gap-4">
		{#if fullentry?.appointments?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<Appointment data={fullentry.appointments} />
			</div>
		{/if}
		{#if fullentry.phones?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center py-2">
					<div class="w-9"><Fa icon={faPhone} size="sm" /></div>
					<div>
						<h3 class="h3 flex place-items-center gap-1">{capitalizeFirstLetter(m.PHONE())} {#if $editMode}<CreatePhone entry={fullentry.uid}/>{/if}</h3>
						
					</div>
				</div>
				<div class="flex items-center p-1">
					<div class="w-9"></div>
					<div class="py-2 space-x-2">
						<Phones data={fullentry.phones} />
					</div>
				</div>
			</div>
		{/if}
		{#if fullentry.emails?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center py-2">
					<div class="w-9"><Fa icon={faEnvelope} size="sm" /></div>
					<div>
						<h3 class="h3 flex place-items-center gap-1">Email{#if $editMode}<CreateEmail entry={fullentry.uid}/>{/if}</h3>
					</div>
				</div>
				<div class="flex">
					<div class="w-9"></div>
					<div class="py-2">
						<Emails data={fullentry.emails} editMode={$editMode} />
					</div>
				</div>
			</div>
		{/if}

		{#if fullentry?.convention || fullentry?.carte_vitale != null || fullentry?.third_party_payers || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<Cost data={fullentry} />
			</div>
		{/if}
			{#if fullentry.payment_methods != null || $editMode}
				<div class="d-flex justify-content-between align-items-start">
					<Payment data={fullentry.payment_methods} editMode={$editMode} />
				</div>
			{/if}
		{#if fullentry.websites?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center p-1">
					<div class="w-9"><Fa icon={faGlobe} size="sm" /></div>
					<div>
						<h3 class="h3 flex place-items-center gap-1">Web{#if $editMode}<CreateWebsite entry={fullentry.uid}/>{/if}</h3>
					</div>
				</div>
				{#if fullentry.websites}
				<div class="flex p-1">
					<div class="w-9"></div>
					<div class="p-1 space-x-2">
						<Websites data={fullentry.websites} />
					</div>
				</div>
				{/if}
			</div>
		{/if}
		{#if fullentry.socialnetworks?.length}
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
						<SoMed data={fullentry.socialnetworks} appBar={false} />
					</div>
				</div>
			</div>
		{/if}
		{#if fullentry?.spoken_languages || fullentry?.rpps || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<Info data={fullentry} />
			</div>
		{/if}
	</div>
	{#if fullentry.address}
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
						<FacilityLink data={fullentry.facility} />
						<Address data={fullentry.address} distance={false} />
					</div>
					{#if fullentry.address.longitude && fullentry.address.latitude}
						<div class="h-56 w-64 lg:h-64 lg:w-96 p-2 z-0">
							<Map data={createMapData(fullentry.address, fullentry.facility.name)} />
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
	{#if memberships || $editMode}
	<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center py-2">
					<div class="w-9"><Fa icon={faPeopleGroup} size="sm" /></div>
					<div>
						<h3 class="h3 flex place-items-center gap-1">{capitalizeFirstLetter(m.MEMBERSHIP({count: 1}))}{#if $editMode}<PatchMembershipModal currentMemberships={memberships}/>{/if}</h3>
					</div>
				</div>
				<div class="flex">
					<div class="w-9"></div>
					<div class="py-2">
						{#if memberships}
							<Membership data={memberships}/>
						{:else}
							Cette entrée n'est membre d'aucune organisation.
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
