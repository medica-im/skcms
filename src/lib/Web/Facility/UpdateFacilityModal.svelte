<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { slugify } from '$lib/helpers/stringHelpers.ts';
	import { updateFacility } from '../../../facility.remote.ts';
	import { invalidate } from '$app/navigation';
	import {
		faPlus,
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { JsonView } from '@zerodevx/svelte-json-view';
	import type { Email } from '$lib/interfaces/email.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { getEffectorUid } from '$lib/components/Directory/context';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { validate } from '$lib/Web/RPPS/validate.ts';
	import type { Validation } from '$lib/Web/RPPS/validate.ts';
	import type { LngLatLike } from 'svelte-maplibre';
	import type { AddressFeature } from '$lib/store/directoryStoreInterface';
	import AddMarkerMap from '$lib/MapLibre/AddMarkerMap.svelte';
	import Geocoder from '$lib/components/Geocoder/Geocoder.svelte';
	import {
		getAddressFeature,
		setAddressFeature,
		setGeoInputAddress
	} from '$lib/components/Directory/context';
	import type { FacilityV2 } from '$lib/interfaces/v2/facility.ts';

	let {
		facility=$bindable()
	}: {
		facility: FacilityV2;
	} = $props();
	const org_cat = page.data.organization.category.name;
	setAddressFeature();
	setGeoInputAddress();

	interface InputClass {
		name: string;
		label: string;
		slug: string;
		geocoder: string;
		building: string;
		street: string;
		geographical_complement: string;
		zip: string;
		zoom: string;
	}
	interface ValidateForm {
		name: boolean;
		label: boolean;
		slug: boolean;
		geocoder: boolean;
		building: boolean;
		street: boolean;
		geographical_complement: boolean;
		zip: boolean;
		zoom: boolean;
	}
	const inputError = 'input-error';
	let addressFeature = getAddressFeature();
	let ban_id = $derived($addressFeature?.properties.id||facility.ban_id);
	let ban_banId = $derived($addressFeature?.properties.banId||facility.ban_banId);
	const inputClass: InputClass = $state({
		name: '',
		label: '',
		slug: '',
		geocoder: '',
		building: '',
		street: '',
		geographical_complement: '',
		zip: '',
		zoom: '',
	});
	const validateForm: ValidateForm = $state({
		name: org_cat == 'msp' ? false : true,
		label: true,
		slug: org_cat == 'msp' ? false : true,
		geocoder: false,
		building: true,
		street: false,
		geographical_complement: true,
		zip: false,
		zoom: false,
	});
	let name: string|null = $state(facility.name);
	let label: string|null = $state(facility.label);
	let slug: string|null = $state(facility.slug);
	let redirect: boolean = $derived(!(slug==null && facility.slug==null) && slug!=facility.slug && !page.url.pathname.startsWith("/web"));
	let building: string|null = $state(facility.building);
	let street: string = $derived($addressFeature?.properties?.name || facility.street);
	let geographical_complement: string = $state('');
	let zip: string|null = $derived($addressFeature?.properties?.postcode || facility.zip);
	let zoom: number = $state(18);
	const getCurrentLongitude = ()=>{
		const oldLongitudeNumber: number|undefined = facility.location?.longitude;
		console.log(`type of oldLongitudeNumber: ${typeof(oldLongitudeNumber)}`);
		if ( oldLongitudeNumber != undefined) {
			const oldLongitudeString = oldLongitudeNumber.toString();
			console.log(`oldLongitudeString: ${oldLongitudeString}`);
			console.log(`type of oldLongitudeString: ${typeof(oldLongitudeString)}`);
			return oldLongitudeString
		}
	}
	let longitude: string|undefined = $state(getCurrentLongitude());
	let lngLat: LngLatLike = $derived.by(() => {
		if ($addressFeature?.geometry.coordinates) {
			return {
				lng: $addressFeature?.geometry.coordinates[0],
				lat: $addressFeature?.geometry.coordinates[1]
			}
		} else if (facility.location?.longitude && facility.location?.latitude) {
			return {
				lng: facility.location.longitude,
				lat: facility.location.latitude
			}
		} else {
			return {
				lng: 0,
				lat: 0
			}
		}
	});
	let formResult = $derived(updateFacility.for(facility.uid).result);
	let disabled: boolean = $derived(
		!Object.values(validateForm).every((v) => v === true) || formResult?.success == true || (
name==facility.name && label==facility.label && slug==facility.slug && building==facility.building && street==facility.street && geographical_complement==facility.geographical_complement && ban_banId==facility.ban_banId && lngLat.lng==facility.location?.longitude && lngLat.lat==facility.location?.latitude
		)
	);

	const uid = getEffectorUid();
	let dialog: HTMLDialogElement | undefined = $state();
	let validation: Validation | undefined = $state();

	onMount(async () => {
	});

	const nameIsValid = (value: string) => {
		return true;
	};
	const labelIsValid = (value: string) => {
		return true;
	};
	const slugIsValid = (value: string) => {
		const regexpSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
		return regexpSlug.test(value);
	};
	const zipIsValid = (value: string) => {
		const regexpFiveDigits = /^\d{5}$/;
		return regexpFiveDigits.test(value);
	};
	const zoomIsValid = (value: number) => {
		return value >= 0 && value <= 20;
	};

	/**
	 * Validate name input.
	 */
	$effect(() => {
		if (name && nameIsValid(name)) {
			validateForm.name = true;
			inputClass.name = '';
		} else {
			inputClass.name = inputError;
			validateForm.name = false;
		}
	});
	/**
	 * Validate label input.
	 */
	$effect(() => {
		if (label && labelIsValid(label)) {
			inputClass.label = '';
			validateForm.label = true;
		} else if (label && !labelIsValid(label)) {
			inputClass.label = inputError;
			validateForm.label = false;
		}
	});
	/**
	 * Validate slug input.
	 */
	$effect(() => {
		if (!slug) {
			validateForm.slug = false;
			inputClass.slug = inputError;
		} else if (slug && slugIsValid(slug)) {
			inputClass.slug = '';
			validateForm.slug = true;
		} else {
			inputClass.slug = inputError;
			validateForm.slug = false;
		}
	});
	/**
	 * Validate geocoder input.
	 */
	$effect(() => {
		if ($addressFeature || street) {
			validateForm.geocoder = true;
			inputClass.geocoder = '';
			return;
		} else {
			inputClass.geocoder = inputError;
			validateForm.geocoder = false;
		}
	});
	/**
	 * Validate zip input.
	 */
	$effect(() => {
		if (!zip) {
			validateForm.zip = true;
			return;
		} else if (zip && zipIsValid(zip)) {
			inputClass.zip = '';
			validateForm.zip = true;
		} else {
			inputClass.zip = inputError;
			validateForm.zip = false;
		}
	});

	/**
	 * Validate zoom input.
	 */
	$effect(() => {
		if (!zoom) {
			validateForm.zoom = true;
			return;
		} else if (zoom && zoomIsValid(zoom)) {
			validateForm.zoom = true;
			inputClass.zoom = '';
		} else {
			inputClass.zoom = inputError;
			validateForm.zoom = false;
		}
	});

	$effect(() => {
		if (!street) {
			inputClass.street = inputError;
			validateForm.street = false;
		} else {
			inputClass.street = '';
			validateForm.street = true;
		}
	});
	let slugSuccess: boolean = $derived(page.url.searchParams.get('success')=='true');
</script>

<button
	onclick={async () => {
		formResult=undefined;
		slugSuccess=false;
		dialog?.showModal();
	}}
	class="btn variant-ghost-surface"
	title="Créer"><span><Fa icon={faPenToSquare} /></span><span>Modifier l'établissement</span></button
>

<Dialog bind:dialog classProp="w-full">
	<div class="rounded-lg w-full p-4 variant-ghost-secondary items-center place-items-center">
		<div class="rounded-lg p-4 variant-ghost-secondary gap-2 items-center place-items-center">
			<h3 class="h3 text-center">Modifier l'établissement</h3>
			<form {...updateFacility.for(facility.uid).enhance(async ({ form, data, submit }) => {
					console.log(data);
					try {
						await submit();
						console.log('Successfully published!');
					} catch (error) {
						console.log(`Oh no! Something went wrong:${error}`);
					}
				})}>
				<div class="p-2 space-y-4 justify-items-stretch grid grid-cols-2 gap-6">
					<div class="p-2 space-y-2 w-full">
						<label class="flex label place-self-start place-items-center space-x-2 w-full">
							{#each updateFacility.for(facility.uid).fields.uid.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							class="input hidden"
							name="uid"
							type="text"
							placeholder=""
							bind:value={facility.uid}
						/>
						{redirect}
						<input
							class="hidden"
							name="redirect"
							type="checkbox"
							placeholder=""
							bind:checked={redirect}
						/>
							<span>Nom</span>
							{#each updateFacility.for(facility.uid).fields.name.issues() as issue}
								<p class="issue">{issue.message}</p>
							{/each}
							<input
								oninput={() => {}}
								class="input {inputClass.name}"
								name="name"
								type="text"
								placeholder=""
								bind:value={name}
							/>
						</label>
						<label class="flex label place-self-start place-items-center space-x-2 w-full">
							<span>Label</span>
							{#each updateFacility.for(facility.uid).fields.label.issues() as issue}
								<p class="issue">{issue.message}</p>
							{/each}
							<input
								oninput={() => {}}
								class="input {inputClass.label}"
								name="label"
								type="text"
								placeholder=""
								bind:value={label}
							/>
						</label>
						<label class="flex label place-self-start place-items-center space-x-2 w-full">
							<span>Slug</span>
							{#each updateFacility.for(facility.uid).fields.slug.issues() as issue}
								<p class="issue">{issue.message}</p>
							{/each}
							<input
								oninput={() => {}}
								class="input {inputClass.slug}"
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
						/>
						{#each updateFacility.for(facility.uid).fields.ban_id.issues() as issue}
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
						{#each updateFacility.for(facility.uid).fields.ban_banId.issues() as issue}
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
						<label class="flex label place-self-start place-items-center space-x-2 w-full">
							<span>Bâtiment</span>
							{#each updateFacility.for(facility.uid).fields.building.issues() as issue}
								<p class="issue">{issue.message}</p>
							{/each}
							<input
								oninput={() => {}}
								class="input {inputClass.building}"
								name="building"
								type="text"
								placeholder=""
								bind:value={building}
							/>
						</label>
						<label class="flex label place-self-start place-items-center space-x-2 w-full">
							<span>Rue</span>
							{#each updateFacility.for(facility.uid).fields.street.issues() as issue}
								<p class="issue">{issue.message}</p>
							{/each}
							<input
								oninput={() => {}}
								class="input {inputClass.street}"
								name="street"
								type="text"
								placeholder=""
								bind:value={street}
							/>
						</label>

						<label class="flex label place-self-start place-items-center space-x-2 w-full">
							<span>Complément géographique</span>
							{#each updateFacility.for(facility.uid).fields.geographical_complement.issues() as issue}
								<p class="issue">{issue.message}</p>
							{/each}
							<input
								oninput={() => {}}
								class="input {inputClass.geographical_complement}"
								name="geographical_complement"
								type="text"
								placeholder=""
								bind:value={geographical_complement}
							/>
						</label>
						<label class="flex label place-self-start place-items-center space-x-2">
							<span>Code postal</span>
							{#each updateFacility.for(facility.uid).fields.zip.issues() as issue}
								<p class="issue">{issue.message}</p>
							{/each}
							<input
								oninput={() => {}}
								class="input {inputClass.zip} w-min"
								name="zip"
								type="text"
								placeholder=""
								bind:value={zip}
							/>
						</label>
						<label class="flex label place-self-start place-items-center space-x-2 w-full">
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
						<label class="flex label place-self-start place-items-center space-x-2">
							<span>Zoom</span>
							{#each updateFacility.for(facility.uid).fields.zoom.issues() as issue}
								<p class="issue">{issue.message}</p>
							{/each}
							<input
								oninput={() => {}}
								class="input {inputClass.zoom}"
								name="zoom"
								type="number"
								min="0"
								max="20"
								placeholder=""
								bind:value={zoom}
							/>
						</label>
						<AddMarkerMap bind:lngLat bind:zoom />
						<div>lngLat.lat: "{lngLat.lat}" type: "{typeof(lngLat.lat)}"</div>
						<label class="flex label place-self-start place-items-center space-x-2">
							<span>Latitude</span>
						<input name="latitude" class="input" bind:value={lngLat.lat} />
						{#each updateFacility.for(facility.uid).fields.latitude.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						</label>
						<div>longitude: "{longitude}" type: "{typeof(longitude)}"</div>
						<div>lngLat.lng: "{lngLat.lng}" type: "{typeof(lngLat.lng)}"</div>
						<label class="flex label place-self-start place-items-center space-x-2">
							<span>Longitude</span>
					
						<input name="longitude" class="input" bind:value={lngLat.lng} />
						{#each updateFacility.for(facility.uid).fields.longitude.issues() as issue}
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
							onclick={() => {
								dialog?.close();
								if (formResult?.success && page.url.pathname.startsWith("/web")) {
									facility=formResult.data;
								}
								page.url.searchParams.set('success', 'false');
								goto(`?${page.url.searchParams.toString()}`);
							}}>{formResult?.success || slugSuccess ? 'Fermer' : 'Annuler'}</button
						>
					</div>
				</div>
			</form>
		</div>
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
