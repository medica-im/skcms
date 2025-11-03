<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { slugify } from '$lib/helpers/stringHelpers.ts';
	import { createFacility } from '../../../facility.remote.ts';
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
	import type { LngLat } from 'maplibre-gl';
	import AddMarkerMap from '$lib/MapLibre/AddMarkerMap.svelte';
	import Geocoder from '$lib/components/Geocoder/Geocoder.svelte';
	import {
		getAddressFeature,
		setAddressFeature,
		setGeoInputAddress
	} from '$lib/components/Directory/context';

	let {
		commune,
		org_cat,
		selectedFacility = $bindable()
	}: {
		commune: { label: string; value: string };
		org_cat: string;
		selectedFacility: { label: string; value: string } | undefined;
	} = $props();

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
		commune: string;
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
		commune: boolean;
	}
	const inputError = 'input-error';
	let addressFeature = getAddressFeature();
	let ban_id = $derived($addressFeature?.properties.id);
	let ban_banId = $derived($addressFeature?.properties.banId);
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
		commune: ''
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
		commune: false
	});
	let name: string = $state('');
	let label: string = $state('');
	let slug: string = $state('');
	let building: string = $state('');
	let street: string | undefined = $derived($addressFeature?.properties?.name);
	let geographical_complement: string = $state('');
	let zip: string = $derived($addressFeature?.properties?.postcode || '');
	let zoom: number = $state(18);
	let lngLat = $derived.by(() => {
		const lngLatArray: [number, number] | undefined = $addressFeature?.geometry.coordinates;
		if (lngLatArray) {
			return { lon: lngLatArray[0], lat: lngLatArray[1] };
		} else {
			return { lon: 0, lat: 0 };
		}
	});
	let formResult = $derived(createFacility.result);
	let disabled: boolean = $derived(!Object.values(validateForm).every((v) => v === true) || formResult?.success==true);

	const uid = getEffectorUid();
	let dialog: HTMLDialogElement | undefined = $state();
	let validation: Validation | undefined = $state();

	const clear = () => {
		name='';
		label='';
		slug='';
		building='';
		street='';
		$addressFeature=null;
		geographical_complement='';
		zip='';
		formResult = undefined;
	};

	onMount(async () => {
		clear();
	});

	const selectFacility = () => {
		if (formResult?.success) {
			selectedFacility = {
				label: formResult?.data.name,
				value: formResult?.data.uid
			};
		}
	};
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
	 * Calculate slug
	 */
	$effect(() => {
		if (name) {
			slug = slugify(name);
		} else if ($addressFeature) {
			slug = slugify($addressFeature.properties.street);
		}
	});
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
	 * Validate commune input.
	 */
	$effect(() => {
		if (commune === undefined) {
			inputClass.commune = inputError;
			validateForm.commune = false;
			return;
		} else {
			inputClass.commune = '';
			validateForm.commune = true;
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
</script>

<button
	onclick={async () => {
		clear();
		dialog?.showModal();
	}}
	class="btn variant-ghost-surface"
	title="Créer"><span><Fa icon={faPlus} /></span><span>Créer un établissement</span></button
>

<Dialog bind:dialog classProp="w-full">
	<div class="rounded-lg w-full p-4 variant-ghost-secondary items-center place-items-center">
		<div class="rounded-lg p-4 variant-ghost-secondary gap-2 items-center place-items-center">
			<h3 class="h3 text-center">Créer un établissement</h3>
			<form {...createFacility.enhance(async ({ form, data, submit }) => {
					console.log(data);
					try {
						await submit();
						console.log('Successfully published!');
					} catch (error) {
						console.log(`Oh no! Something went wrong:${error}`);
					}
				})}
				class=""
			>
				<div class="p-2 space-y-4 justify-items-stretch grid grid-cols-2 gap-6">
					<div class="p-2 space-y-2 w-full">
						<label class="flex label place-self-start place-items-center space-x-2 w-full">
							<span>Nom</span>
							{#each createFacility.fields.name.issues() as issue}
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
							{#each createFacility.fields.label.issues() as issue}
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
							{#each createFacility.fields.slug.issues() as issue}
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
								commune={commune.label}
								placeholder={"Entrer l'adresse"}
								inputClass={inputClass.geocoder}
								limitToZip={false}
							/>
						{#each createFacility.fields.ban_id.issues() as issue}
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
						{#each createFacility.fields.ban_banId.issues() as issue}
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
							{#each createFacility.fields.building.issues() as issue}
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
							{#each createFacility.fields.street.issues() as issue}
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
							{#each createFacility.fields.geographical_complement.issues() as issue}
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
							{#each createFacility.fields.zip.issues() as issue}
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
							{#each createFacility.fields.commune.issues() as issue}
			<p class="issue">{issue.message}</p>
		{/each}
		<input
								disabled
								class="input {inputClass.commune} w-full"
								type="text"
								placeholder=""
								value={commune.label}
							/>
							<input {...createFacility.fields.commune.as("text")}
							class="hidden"
								value={commune.value}
							/>
						</label>
					</div>
					<div class="p-2 space-y-2 w-full h-full">
						<label class="flex label place-self-start place-items-center space-x-2">
							<span>Zoom</span>
							{#each createFacility.fields.zoom.issues() as issue}
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
						<input
						{...createFacility.fields.latitude.as("text")}
								bind:value={lngLat.lat}
							/>
						{#each createFacility.fields.latitude.issues() as issue}
			<p class="issue">{issue.message}</p>
		{/each}
		<input
						{...createFacility.fields.longitude.as("text")}
								bind:value={lngLat.lon}
							/>
		{#each createFacility.fields.longitude.issues() as issue}
			<p class="issue">{issue.message}</p>
		{/each}
					</div>
				</div>
				<div class="flex gap-8">
					<div class="flex gap-2 items-center">
					{#if formResult?.success}
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
								selectFacility();
							}}>{formResult?.success ?'Fermer':'Annuler'}</button
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
