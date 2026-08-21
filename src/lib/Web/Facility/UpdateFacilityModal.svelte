<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { updateFacility } from '../../../facility.remote.ts';
	import { faCheck, faPenToSquare, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { JsonView } from '@zerodevx/svelte-json-view';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { capitalizeFirstLetter, slugify } from '$lib/helpers/stringHelpers';
	import type { LngLatLike } from 'svelte-maplibre';
	import type { AddressFeature } from '$lib/store/directoryStoreInterface';
	import AddMarkerMap from '$lib/MapLibre/AddMarkerMap.svelte';
	import Geocoder from '$lib/components/Geocoder/Geocoder.svelte';
	import {
		getAddressFeature,
		setAddressFeature,
		setGeoInputAddress
	} from '$lib/components/Directory/context';
	import { mspPostgres } from '$lib/constants.ts';
	import {
		validateName,
		validateLabel,
		validateSlug,
		validateGeocoder,
		validateZoom,
		validateStreet,
		validateZip
	} from './validate.ts';
	import type { FacilityV2 } from '$lib/interfaces/v2/facility.ts';
	import type { InputClass, IsRequired, ValidateForm } from './validate.ts';

	let {
		facility = $bindable()
	}: {
		facility: FacilityV2;
	} = $props();

	let uid = $derived(facility.uid);

	const isMSP: boolean = page.data.organization.category.name === mspPostgres;
	setAddressFeature();
	setGeoInputAddress();

	let addressFeature = getAddressFeature();
	let ban_id = $derived($addressFeature?.properties.id || facility.ban_id);
	let ban_banId = $derived($addressFeature?.properties.banId || facility.ban_banId);
	const inputClass: InputClass = $state({
		name: '',
		label: '',
		slug: '',
		geocoder: '',
		building: '',
		street: '',
		geographical_complement: '',
		zip: '',
		zoom: ''
	});
	const isRequired: IsRequired = {
		name: isMSP ? true : false,
		label: false,
		slug: isMSP ? true : false,
		geocoder: false,
		building: false,
		street: false,
		geographical_complement: false,
		zip: false,
		zoom: false
	};
	let validateForm: ValidateForm = $state({
		name: !isRequired.name,
		label: !isRequired.label,
		slug: !isRequired.slug,
		geocoder: !isRequired.geocoder,
		building: !isRequired.building,
		street: !isRequired.street,
		geographical_complement: !isRequired.geographical_complement,
		zip: !isRequired.zip,
		zoom: !isRequired.zoom
	});
	let name: string | null = $state(facility.name);
	let label: string | null = $state(facility.label);
	let slug: string | null = $state(facility.slug);
	let redirect: boolean = $derived(
		!(slug == null && facility.slug == null) &&
			slug != facility.slug &&
			!page.url.pathname.startsWith('/web')
	);
	let building: string | null = $state(facility.building);
	let street: string = $derived($addressFeature?.properties?.name || facility.street);
	let geographical_complement: string = $state('');
	let zip: string | null = $derived($addressFeature?.properties?.postcode || facility.zip);
	let zoom: number = $state(18);
	let { lng, lat } = $derived.by(() => {
		if ($addressFeature?.geometry.coordinates) {
			return {
				lng: $addressFeature?.geometry.coordinates[0],
				lat: $addressFeature?.geometry.coordinates[1]
			};
		} else if (facility.location?.longitude && facility.location?.latitude) {
			return {
				lng: facility.location.longitude,
				lat: facility.location.latitude
			};
		} else {
			return {
				lng: 0,
				lat: 0
			};
		}
	});
	let formResult = $derived(updateFacility.for(uid).result);
	let disabled: boolean = $derived(
		!!updateFacility.for(uid).pending ||
			!Object.values(validateForm).every((v) => v === true) ||
			formResult?.success == true ||
			(name == facility.name &&
				label == facility.label &&
				slug == facility.slug &&
				building == facility.building &&
				street == facility.street &&
				geographical_complement == facility.geographical_complement &&
				ban_banId == facility.ban_banId &&
				lng == facility.location?.longitude &&
				lat == facility.location?.latitude)
	);

	let dialog: HTMLDialogElement | undefined = $state();

	let slugSuccess: boolean = $derived(page.url.searchParams.get('success') == 'true');
	onMount(() => {
		validateName(name, inputClass, isRequired, validateForm);
		validateLabel(label, inputClass, isRequired, validateForm);
		validateStreet(street, inputClass, isRequired, validateForm);
		validateZoom(zoom, inputClass, isRequired, validateForm);
		validateSlug(slug, inputClass, isRequired, validateForm);
		validateZip(zip, inputClass, isRequired, validateForm);
		validateGeocoder($addressFeature, inputClass, isRequired, validateForm);
	});
</script>

<button
	onclick={async () => {
		formResult = undefined;
		slugSuccess = false;
		dialog?.showModal();
	}}
	class="btn bg-surface-100-800-token text-surface-900-50-token variant-ringed-surface shadow opacity-90 hover:opacity-100 transition-opacity"
	title="Créer"
	><span><Fa icon={faPenToSquare} /></span><span class="whitespace-normal text-left">Modifier l'établissement</span></button
>

<!--
	overflow="" so the dialog's own overflow-y-auto applies: this form is taller
	than a phone screen and has to scroll to its buttons.
-->
<Dialog bind:dialog classProp="w-full" overflow="">
	<div class="rounded-lg w-full p-4 variant-ghost-secondary items-center place-items-center">
		<h3 class="h3 text-center">Modifier l'établissement</h3>
		<form
			{...updateFacility.for(uid).enhance(async ({ submit }) => {
				try {
					await submit();
					// The directory map plots each entry's own coordinates, and those
					// entries come from the root layout's load. Without this the
					// facility page shows the new position while every pin on the
					// annuaire stays where it was, until that load runs again for
					// some other reason. Same signal AvatarUploadModal and
					// AccessControl use after a write.
					//
					// After submit(), not in the Fermer handler where the only
					// refresh used to live: a user who saves and navigates away
					// never presses it.
					if (updateFacility.for(uid).result?.success) {
						await invalidate('app:entries');
					}
				} catch (error) {
					console.error(`Oh no! Something went wrong:${error}`);
				}
			})}
		>
			<div class="p-2 space-y-4 justify-items-stretch grid grid-cols-1 lg:grid-cols-2 lg:gap-6">
				<div class="space-y-2 w-full">
					{#each updateFacility.for(uid).fields.uid.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
					<input class="input hidden" name="uid" type="text" placeholder="" bind:value={uid} />
					<input
						class="hidden"
						name="redirect"
						type="checkbox"
						placeholder=""
						bind:checked={redirect}
					/>
					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Nom</span>
						{#each updateFacility.for(uid).fields.name.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							oninput={() => {}}
							class="input w-full {inputClass.name}"
							name="name"
							type="text"
							placeholder=""
							bind:value={name}
							onchange={() => {
								validateName(name, inputClass, isRequired, validateForm);
								// The URL is built from the slug, so a rename that keeps the old
								// slug lets two facilities claim the same /sites/<slug> address.
								// Only follow the name while the slug still matches it: a slug
								// edited by hand is left alone.
								if (name && slug === slugify(facility.name ?? '')) {
									slug = slugify(name);
									validateSlug(slug, inputClass, isRequired, validateForm);
								}
							}}
						/>
					</label>
					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Label</span>
						{#each updateFacility.for(uid).fields.label.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							oninput={() => {}}
							class="input w-full {inputClass.label}"
							name="label"
							type="text"
							placeholder=""
							bind:value={label}
							onchange={() => {
								validateLabel(label, inputClass, isRequired, validateForm);
							}}
						/>
					</label>
					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Slug</span>
						{#each updateFacility.for(uid).fields.slug.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							oninput={() => {}}
							class="input w-full {inputClass.slug}"
							name="slug"
							type="text"
							placeholder=""
							bind:value={slug}
						/>
					</label>
					<Geocoder
						commune={facility.commune.name_fr}
						placeholder={"Entrer l'adresse"}
						inputClass={inputClass.geocoder}
						bind:isValid={validateForm}
					/>
					{#each updateFacility.for(uid).fields.ban_id.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
					<input
						oninput={() => {}}
						class="input hidden"
						name="ban_id"
						type="text"
						placeholder=""
						bind:value={ban_id}
					/>
					{#each updateFacility.for(uid).fields.ban_banId.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
					<input
						oninput={() => {}}
						class="input hidden"
						name="ban_banId"
						type="text"
						placeholder=""
						bind:value={ban_banId}
					/>
					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Bâtiment</span>
						{#each updateFacility.for(uid).fields.building.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							oninput={() => {}}
							class="input w-full {inputClass.building}"
							name="building"
							type="text"
							placeholder=""
							bind:value={building}
						/>
					</label>
					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Rue</span>
						{#each updateFacility.for(uid).fields.street.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							oninput={() => {}}
							class="input w-full {inputClass.street}"
							name="street"
							type="text"
							placeholder=""
							bind:value={street}
							onchange={() => {
								validateStreet(street, inputClass, isRequired, validateForm);
							}}
						/>
					</label>

					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Complément géographique</span>
						{#each updateFacility.for(uid).fields.geographical_complement.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							oninput={() => {}}
							class="input w-full {inputClass.geographical_complement}"
							name="geographical_complement"
							type="text"
							placeholder=""
							bind:value={geographical_complement}
						/>
					</label>
					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Code postal</span>
						{#each updateFacility.for(uid).fields.zip.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							oninput={() => {}}
							class="input w-full {inputClass.zip}"
							name="zip"
							type="text"
							placeholder=""
							bind:value={zip}
							onchange={() => {
								validateZip(zip, inputClass, isRequired, validateForm);
							}}
						/>
					</label>
					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Commune</span>
						<input
							disabled
							class="input w-full"
							type="text"
							placeholder=""
							value={facility.commune.name_fr}
						/>
					</label>
				</div>
				<div class="p-2 space-y-2 w-full h-full">
					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Zoom</span>
						{#each updateFacility.for(uid).fields.zoom.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							oninput={() => {}}
							class="input w-full {inputClass.zoom}"
							name="zoom"
							type="number"
							min="0"
							max="20"
							placeholder=""
							bind:value={zoom}
							onchange={() => {
								validateZoom(zoom, inputClass, isRequired, validateForm);
							}}
						/>
					</label>
					<AddMarkerMap bind:lng bind:lat bind:zoom />
					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Latitude</span>
						<input name="latitude" class="input w-full" bind:value={lat} />
						{#each updateFacility.for(uid).fields.latitude.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
					</label>
					<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
						<span>Longitude</span>

						<input name="longitude" class="input w-full" bind:value={lng} />
						{#each updateFacility.for(uid).fields.longitude.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
					</label>
				</div>
			</div>
			<div class="flex gap-8">
				<div class="flex gap-2 items-center">
					{#if formResult?.success || slugSuccess}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if formResult && !formResult.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{formResult.text}
					{/if}
				</div>
				<div class="w-auto justify-center">
					<button type="submit" class="variant-filled-secondary btn w-min" {disabled}
						>Envoyer</button
					>
				</div>
				<div class="w-auto justify-center">
					<button
						type="button"
						class="variant-filled-error btn w-min"
						onclick={async () => {
							dialog?.close();
							if (formResult?.success) {
								// Update the bound facility wherever the dialog was opened from,
								// not only under /web: the page that hosts it shows this name.
								facility = formResult.data;
								// Other pages (the home page facility list, /sites) read their
								// own load data, which is still the pre-rename copy. Re-running
								// the loads is what makes the new name show up there without a
								// manual reload.
								await invalidateAll();
							}
							page.url.searchParams.set('success', 'false');
							goto(`?${page.url.searchParams.toString()}`);
						}}>{formResult?.success || slugSuccess ? 'Fermer' : 'Annuler'}</button
					>
				</div>
			</div>
		</form>
	</div></Dialog
>

<style lang="postcss">
	.wrap {
		font-family: monospace;
		font-size: 8px;
		--jsonBorderLeft: 2px dashed red;
		--jsonValColor: blue;
	}
</style>
