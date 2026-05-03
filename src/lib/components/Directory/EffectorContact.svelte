<script lang="ts">
	import { page } from '$app/state';
	import { userRoles } from '$lib/auth/roles';
	import { variables } from '$src/lib/utils/constants';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Fa from 'svelte-fa';
	import { faEnvelope } from '@fortawesome/free-regular-svg-icons';
	import {
		faGlobe,
		faCircleNodes,
		faPhone,
		faMapLocationDot,
		faPenToSquare,
		faInfo
	} from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import Emails from '$lib/Email/Emails.svelte';
	import Phones from '$lib/Directory/Phone/Phones.svelte';
	import Address from '$lib/Directory/Address.svelte';
	import Websites from '$lib/Website/Websites.svelte';
	import { MapLibre, DefaultMarker } from 'svelte-maplibre';
	import { createContactMapData } from '$lib/components/Map/mapData';
	import * as openStreetMap from '$lib/MapLibre/style/openStreetMap.json';
	import SoMed from '$lib/SoMed/SoMed.svelte';
	import Appointment from '$lib/components/Effector/Appointment/Appointments.svelte';
	import Cost from '$lib/components/Effector/Cost/Cost.svelte';
	import Payment from '$lib/Addressbook/Payment/Payment.svelte';
	import { FacilityLink } from '$lib';
	import Info from '$lib/components/Effector/Info/Info.svelte';
	import Avatar from '$lib/components/Effector/Avatar/Avatar.svelte';
	import Back from '$lib/components/Directory/Back.svelte';
	import Switch from '$lib/Switch/Switch.svelte';
	import CreatePhone from '$lib/Web/Phone/CreatePhone.svelte';
	import CreateEmail from '$lib/Web/Email/Create.svelte';
	import CreateWebsite from '$lib/Web/Website/Create.svelte';
	import CreateSoMed from '$lib/Web/SocialMedia/Create.svelte';
	import UpdateEffector from '$lib/Web/Effector/UpdateEffectorModal.svelte';
	import EntryToggleActive from '$lib/Web/Entry/EntryToggleActive.svelte';
	import Tag from '$lib/Tag/Tag.svelte';
	import { setEditMode, getEditMode, setEntryUid, setEffectorUid } from './context';
	import UuidHex from '$lib/Uuid/UuidHex.svelte';
	import UuidHyphen from '$lib/Uuid/UuidHyphen.svelte';
	import MembershipSection from '$lib/components/Directory/MembershipSection.svelte';
	import CreatorOwner from '$lib/Web/Users/CreatorOwner.svelte';
	import RedeemEmail from '$lib/Web/Entry/RedeemEmail.svelte';
	import TagModal from '$lib/Web/Tag/TagModal.svelte';
	import AvatarUploadModal from '$lib/Web/Avatar/AvatarUploadModal.svelte';
	import { JsonView } from '@zerodevx/svelte-json-view';
	import Affiliates from '$lib/Facility/Affiliates.svelte';
	import AccessControl from '$lib/Web/Entry/AccessControl.svelte';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';
	let { data } = $props();
	const r = $derived(userRoles(page.data?.user?.role));

	let fullentry: EntryFull = $derived(data.fullentry);
	let memberships: Entry[] | null = $derived(data.memberships);
	setEntryUid(data.fullentry.uid);
	setEffectorUid(data.fullentry.effector_uid);
	setEditMode();
	const editMode = getEditMode();
	const avatar = $derived(fullentry.avatar);
</script>

<svelte:head>
	<title>
		{fullentry.name} - {capitalizeFirstLetter(
			page.data.organization.formatted_name,
			variables.DEFAULT_LANGUAGE
		)}
	</title>
</svelte:head>
<div class="grid grid-cols-1 space-y-4">
	{#if r.Member}
		<div
			id="sticky-banner"
			tabindex="-1"
			class="sticky top-0 right-10 w-full flex justify-end z-100 h-0 overflow-visible"
		>
			<Switch icon={faPenToSquare} />
		</div>
	{/if}

	<div class="flex flex-wrap p-2 gap-10">
		<div class="flex flex-wrap-reverse justify-start lg:justify-end gap-4 lg:gap-8 min-w-0">
			<div class="grid grid-cols-1 items-start content-start gap-2 min-w-0 max-w-prose">
				{#if r.SuperUser && $editMode}
					entry {fullentry?.uid}
					<UuidHex data={fullentry?.uid} />
					<UuidHyphen data={fullentry?.uid} />
				{/if}
				<h2 class="h3 flex flex-wrap min-w-0 break-words place-items-center gap-4">
					{fullentry.name}{#if $editMode}<UpdateEffector data={fullentry} />{/if}
					{#if fullentry.active === false}
						<span class="badge variant-filled-error badge-sm" title={m.ENTRY_INACTIVE()}
							>{m.INACTIVE()}</span
						>
					{/if}
				</h2>
				{#if r.SuperUser && $editMode}
					effector {fullentry?.effector_uid}
					<UuidHex data={fullentry?.effector_uid} />
					<UuidHyphen data={fullentry?.effector_uid} />
				{/if}
				<h3 class="h4 italic">{fullentry?.effector_type?.label}</h3>
				{#if r.SuperUser && $editMode}
					type {fullentry?.effector_type?.uid}
					<UuidHex data={fullentry?.effector_type?.uid} />
					<UuidHyphen data={fullentry?.effector_type?.uid} />
				{/if}
				<Tag data={fullentry?.tags} compact={false} />
				{#if $editMode}<TagModal tags={fullentry.tags} />{/if}
				<MembershipSection {memberships} editMode={$editMode} uid={fullentry.uid} />
			</div>
			<div class="flex-none space-y-2">
				{#if fullentry?.avatar}
					<Avatar {avatar} name={data.name} size="lg" />
				{/if}
				{#if $editMode}
					<AvatarUploadModal entryUid={fullentry.uid} hasAvatar={!!fullentry?.avatar?.raw} />
				{/if}
			</div>
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
						<h4 class="h4 flex place-items-center gap-1">
							{capitalizeFirstLetter(m.PHONE())}
							{#if $editMode}<CreatePhone entry={fullentry.uid} />{/if}
						</h4>
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
						<h4 class="h4 flex place-items-center gap-1">
							Email{#if $editMode}<CreateEmail entry={fullentry.uid} />{/if}
						</h4>
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
						<h4 class="h4 flex place-items-center gap-1">
							Web{#if $editMode}<CreateWebsite entry={fullentry.uid} />{/if}
						</h4>
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
		{#if fullentry.socialnetworks?.length || $editMode}
			<div class="d-flex justify-content-between align-items-start">
				<div class="flex items-center p-1">
					<div class="w-9"><Fa icon={faCircleNodes} /></div>
					<div>
						<h4 class="h4 flex items-center gap-1">
							{m.ADDRESSBOOK_SOMED()}{#if $editMode}<CreateSoMed entry={fullentry.uid} />{/if}
						</h4>
					</div>
				</div>
				{#if fullentry.socialnetworks}
					<div class="flex p-1">
						<div class="w-9"></div>
						<div class="p-1 space-x-2">
							<SoMed data={fullentry.socialnetworks} editMode={$editMode} appBar={false} />
						</div>
					</div>
				{/if}
			</div>
		{/if}
		{#if fullentry?.spoken_languages?.length || fullentry?.rpps || $editMode}
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
					<h4 class="h4">{capitalizeFirstLetter(m.ADDRESSBOOK_LOCATION())}</h4>
				</div>
			</div>
			<div class="flex p-1">
				<div class="w-9"></div>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-1">
					<div class="space-y-2">
						<FacilityLink data={fullentry.facility} />
						{#if r.SuperUser && $editMode}
							facility {fullentry?.facility?.uid}
							<UuidHex data={fullentry?.facility?.uid} />
							<UuidHyphen data={fullentry?.facility?.uid} />
						{/if}
						<Address data={fullentry.address} distance={false} />
					</div>
					{#if fullentry.address.longitude && fullentry.address.latitude}
						{@const mapData = createContactMapData(fullentry.address, fullentry.facility.name)}
						<div class="h-56 w-64 lg:h-64 lg:w-96 p-2 z-0">
							<MapLibre
								center={mapData.lngLat}
								zoom={mapData.zoom}
								class="h-full"
								standardControls
								style={openStreetMap}
							>
								<DefaultMarker lngLat={mapData.lngLat} />
							</MapLibre>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
	<Affiliates uid={fullentry.uid}/>
	{#if r.Admin || fullentry.owner?.includes(page.data?.user?.uid)}
		<AccessControl access={fullentry.access} editMode={$editMode} />
	{/if}
	{#if ['superuser', 'administrator'].includes(page.data?.user?.role)}
		<CreatorOwner owner={fullentry.owner} creator={fullentry.creator} />
		<RedeemEmail data={fullentry} editMode={$editMode} />
	{/if}
	{#if $editMode}
		<div class="flex flex-row">
			<EntryToggleActive active={fullentry.active} />
		</div>
	{/if}
	<div class="flex flex-row-reverse">
		<Back />
	</div>
	{#if import.meta.env.DEV}
		<div>
			<JsonView json={data} depth={1} />
		</div>
	{/if}
</div>
