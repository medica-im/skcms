<script lang="ts">
	import { variables } from '$src/lib/utils/constants';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import FacilityPage from '$lib/Facility/FacilityPage.svelte';
	import SitesLink from '$lib/components/Sites/SitesLink.svelte';
	import { page } from '$app/state';
	import UpdateFacilityModal from '$lib/Web/Facility/UpdateFacilityModal.svelte';
	import PlaceImageUploadModal from '$lib/Web/Facility/PlaceImageUploadModal.svelte';
	import Switch from '$lib/Switch/Switch.svelte';
	import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import { setEditMode, getEditMode } from '$lib/components/Directory/context';
	import Back from '$lib/components/Directory/Back.svelte';
	import type { FacilityV2 } from '$lib/interfaces/v2/facility.ts';
	import type { Facility } from '$lib/interfaces/facility.interface';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Same store the entry page uses, so the pencil behaves identically here.
	setEditMode();
	const editMode = getEditMode();

	let dataV2 = $derived(data.facility ? getFacilityV2(data.facility) : undefined);

	/**
	 * Whether this visitor may change this facility.
	 *
	 * Asked of the server rather than inferred from the session: being signed in
	 * says nothing about being connected to *this* facility, and a staff member
	 * of the organisation who has no entry here may not edit it. Gating on the
	 * session alone offered the controls to everyone with an account and left
	 * the server to refuse them on save.
	 *
	 * Answered in the load function, so it arrives with the page data on a
	 * client-side navigation as well as on a reload. Awaiting it here instead
	 * left it unresolved when the page was reached by following a link, and the
	 * controls appeared only after a reload.
	 */
	let canEdit = $derived(data.canEdit === true);
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
			ban_banId: null,
			// Carried through so the button can offer to modify an existing
			// picture rather than to add a first one.
			image: facility.image ?? null
		};
	}

</script>

<svelte:head>
	<title>
		{data.facility?.name} - {capitalizeFirstLetter(
			page.data.organization.formatted_name,
			variables.DEFAULT_LANGUAGE
		)}
	</title>
</svelte:head>

<header id="hero" class="bg-surface-100-800-token hero-gradient relative">
	<div class="mx-0 flex flex-col items-center justify-center p-4 py-6">
		<h2 class="h2">{data.facility?.name}</h2>
	</div>
	<!--
		The pencil overlays the title band rather than the content below it, which
		keeps it clear of the buttons it reveals: when they appeared directly
		underneath, pressing the pencil a second time landed on "edit facility"
		and edit mode could not be turned off.

		Absolutely positioned, so it claims no space and the title stays centred.
	-->
	{#if canEdit && dataV2}
		<!--
			Inset grows with the screen: 12px keeps the pencil clear of the edge
			on a phone without crowding the title, 16px gives it room to breathe
			once there is room to spare.
		-->
		<div class="absolute top-3 right-3 sm:top-4 sm:right-4 z-50">
			<Switch icon={faPenToSquare} />
		</div>
		{#if $editMode}
			<!--
				Tucked just under the pencil — top-14 clears its 40px plus the 8px
				offset — and absolutely positioned so revealing them moves nothing
				on the page. They may hang past the header; overflow stays visible.
			-->
			<!--
				The transparency lives on the buttons themselves (a translucent
				surface token plus backdrop-blur, so it reads dark-on-light or
				light-on-dark with the theme). No opacity here, which would dim
				them a second time and wash out the text.
			-->
			<!--
				Sits one pencil-height plus a gap below it, tracking the inset
				above so the two stay aligned: 12+40+8 on a phone, 16+40+8 once
				there is room. (Tailwind 3 has no top-15, hence the explicit
				values.)
			-->
			<div
				class="absolute top-[60px] right-3 sm:top-16 sm:right-4 z-40 flex flex-col items-end gap-2"
			>
				<UpdateFacilityModal facility={dataV2} />
				<PlaceImageUploadModal
					facilityUid={dataV2.uid}
					hasImage={!!dataV2.image}
					alt={dataV2.image?.alt ?? ''}
				/>
			</div>
		{/if}
	{/if}
</header>
<!-- Breathing room at the sides grows with the screen: on a wide monitor the
     columns would otherwise run almost to the edges of the window. -->
<div class="mx-0 flex flex-col items-center justify-center p-4 py-6 lg:px-8 xl:px-12 2xl:px-20">
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
