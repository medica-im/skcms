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
		getGeoInputAddress,
		setAddressFeature,
		setGeoInputAddress
	} from '$lib/components/Directory/context';
	import { page } from '$app/state';
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
	import type { InputClass, IsRequired, ValidateForm } from './validate.ts';

	let {
		commune,
		selectedFacility = $bindable()
	}: {
		commune: { label: string; value: string };
		selectedFacility: { label: string; value: string } | undefined;
	} = $props();

	const isMSP: boolean = page.data.organization.category.name === mspPostgres;

	setAddressFeature();
	setGeoInputAddress();

	let addressFeature = getAddressFeature();
	let geoInputAddress = getGeoInputAddress();
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
	});
	const isRequired: IsRequired = {
		name: isMSP ? true : false,
		label: false,
		slug: isMSP ? true : false,
		geocoder: true,
		building: false,
		street: false,
		geographical_complement: false,
		zip: false,
		zoom: false,
	};
	let street: string | null = $derived($addressFeature?.properties?.name || null);
	let validateForm: ValidateForm = $state({
		name: !isRequired.name,
		label: !isRequired.label,
		slug: !isRequired.slug,
		geocoder: !isRequired.geocoder,
		building: !isRequired.building,
		street: !isRequired.street,
		geographical_complement: !isRequired.geographical_complement,
		zip: !isRequired.zip,
		zoom: !isRequired.zoom,
	});
	let name: string = $state('');
	let label: string = $state('');
	let slug: string = $derived.by(() => {
		if (name) {
			return slugify(name);
		} else if ($addressFeature) {
			return slugify($addressFeature.properties.street);
		} else {
			return '';
		}
	});
	let building: string = $state('');
	let geographical_complement: string = $state('');
	let zip: string = $derived($addressFeature?.properties?.postcode || '');
	let zoom: number = $state(18);
	let { lng, lat } = $derived.by(() => {
		const lngLatArray: [number, number] | undefined = $addressFeature?.geometry.coordinates;
		if (lngLatArray) {
			return { lng: lngLatArray[0], lat: lngLatArray[1] };
		} else {
			return { lng: 0, lat: 0 };
		}
	});
	let formResult = $derived(createFacility.result);
	let disabled: boolean = $derived(!!createFacility.pending ||
		!Object.values(validateForm).every((v) => v === true) || formResult?.success == true
	);

	let dialog: HTMLDialogElement | undefined = $state();

	const clear = () => {
		name = '';
		label = '';
		slug = '';
		building = '';
		street = '';
		$geoInputAddress = null;
		$addressFeature = null;
		geographical_complement = '';
		zip = '';
		formResult = undefined;
	};

	const selectFacility = () => {
		if (formResult?.success) {
			selectedFacility = {
				label: formResult?.data.name,
				value: formResult?.data.uid
			};
		}
	};

	onMount(() => {
		clear();
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
	onclick={() => {
		clear();
		dialog?.showModal();
	}}
	class="btn variant-filled-primary"
	title="Créer"><span><Fa icon={faPlus} /></span><span>Créer un établissement</span></button
>

<Dialog bind:dialog classProp="w-full">
	<div class="rounded-lg w-full p-4 variant-ghost-secondary items-center place-items-center">
		<h3 class="h3 text-center">Créer un établissement</h3>
		<form
			{...createFacility}
			class=""
		>
			<div class="p-2 space-y-4 justify-items-stretch grid grid-cols-1 lg:grid-cols-2 lg:gap-6">
				<div class="space-y-2 w-full">
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
							onchange={() => {
								validateName(name, inputClass, isRequired, validateForm, true);
							}}
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
							onchange={() => {
								validateLabel(label, inputClass, isRequired, validateForm);
							}}
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
						bind:inputClass={inputClass.geocoder}
						bind:isValid={validateForm}
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
							class="input {inputClass.street}"
							name="street"
							type="text"
							placeholder=""
							bind:value={street}
							oninput={() => {
								validateStreet(street, inputClass, isRequired, validateForm);
							}}
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
							class="input {inputClass.zip}"
							name="zip"
							type="text"
							placeholder=""
							bind:value={zip}
							onchange={() => {
								validateZip(zip, inputClass, isRequired, validateForm);
							}}
						/>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Commune</span>
						{#each createFacility.fields.commune.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							disabled
							class="input w-full"
							type="text"
							placeholder=""
							value={commune.label}
						/>
						<input
							{...createFacility.fields.commune.as('text')}
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
					<AddMarkerMap bind:lng bind:lat bind:zoom />
					<label class="flex label place-self-start place-items-center space-x-2">
						<span>Latitude</span>

						<input
							class="input"
							{...createFacility.fields.latitude.as('text')}
							bind:value={lat}
						/>
						{#each createFacility.fields.latitude.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
					</label>
					<label class="flex label place-self-start place-items-center space-x-2">
						<span>Longitude</span>

						<input
							class="input"
							{...createFacility.fields.longitude.as('text')}
							bind:value={lng}
						/>
						{#each createFacility.fields.longitude.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
					</label>
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
						}}>{formResult?.success ? 'Fermer' : 'Annuler'}</button
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
