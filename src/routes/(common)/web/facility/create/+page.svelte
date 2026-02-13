<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { slugify } from '$lib/helpers/stringHelpers.ts';
	import { createFacility } from '$src/facility.remote.ts';
	import {
		faCheck,
		faExclamationCircle
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { AddressFeature } from '$lib/store/directoryStoreInterface';
	import AddMarkerMap from '$lib/MapLibre/AddMarkerMap.svelte';
	import Geocoder from '$lib/components/Geocoder/Geocoder.svelte';
	import {
		getAddressFeature,
		getGeoInputAddress,
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
	} from '$lib/Web/Facility/validate.ts';
	import type { InputClass, IsRequired, ValidateForm } from '$lib/Web/Facility/validate.ts';
	import type { PageData } from './$types';

	interface Props {
		data: {
			session: PageData['session'];
			organization: PageData['organization'];
		};
		commune: { label: string; value: string };
		department: { label: string; value: string };
		selectedFacility?: { label: string; value: string };
		facilityCreateOpen?: boolean;
	}

	let {
		data,
		commune,
		department,
		selectedFacility = $bindable(),
		facilityCreateOpen = $bindable()
	}: Props = $props();

	let geocoder: boolean = $state(true);
	const isMSP: boolean = data.organization.category.name === mspPostgres;

	setAddressFeature();
	setGeoInputAddress();

	let addressFeature = getAddressFeature();
	let geoInputAddress = getGeoInputAddress();
	let ban_id = $derived($addressFeature?.properties.id);
	let ban_banId = $derived($addressFeature?.properties.banId);
	let showMap = $derived(!!$addressFeature?.geometry?.coordinates || !geocoder);
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
			return slugify(`${$addressFeature.properties.housenumber}-${$addressFeature.properties.street}`);
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
	!street || formResult?.success == true
	);

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
		geocoder = true;
	};

	const selectFacility = () => {
		if (formResult?.success) {
			selectedFacility = {
				label: formResult.data.name,
				value: formResult.data.uid
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

<div class="rounded-lg w-full p-4 variant-ghost-secondary items-center place-items-center space-y-6">
	<h3 class="h3 text-center">Créer un établissement</h3>
	<form
		{...createFacility.enhance(async ({form, data, submit}) => {
			await submit();
		})}
		class="space-y-6"
	>
		<div class="p-2 space-y-6 justify-items-stretch grid grid-cols-1 lg:grid-cols-{showMap ? '2' : '1'} lg:gap-10">
			<div class="space-y-4 w-full">
				<label class="flex label place-self-start place-items-center space-x-2 w-full">
					<span>Département</span>
					<input
						disabled
						class="input w-full"
						type="text"
						placeholder=""
						value={department.label}
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
				<label class="{createFacility.fields.slug.issues() ? '' : 'hidden'} flex label place-self-start place-items-center space-x-2 w-full">
					<span>{capitalizeFirstLetter(m.slug())}</span>
					{#each createFacility.fields.slug.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
					<input
						oninput={() => {}}
						class="{createFacility.fields.slug.issues() ? '' : 'hidden'} input {inputClass.slug}"
						name="slug"
						type="text"
						placeholder=""
						bind:value={slug}
					/>
				</label>
				{#if geocoder}
				<Geocoder
					commune={commune.label}
					placeholder={"Entrer l'adresse: N° & voie"}
					bind:isValid={validateForm}
					limitToZip={false}
				/>
				{/if}
				<label class="flex label place-self-start place-items-center space-x-2 w-full">
				<span class="text-sm">Je n'ai pas trouvé pas l'adresse exacte dans le géocodeur</span>
					<input type="checkbox" checked={!geocoder} onchange={() => geocoder = !geocoder} />
					</label>
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
				<label class="{street ? '' : 'hidden'} flex label place-self-start place-items-center space-x-2 w-full">
					<span>Bâtiment</span>
					{#each createFacility.fields.building.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
					<input
						oninput={() => {}}
						class="input {street ? '' : 'hidden'} {inputClass.building}"
						name="building"
						type="text"
						placeholder=""
						bind:value={building}
					/>
				</label>
				<label class="{geocoder ? 'hidden' : ''} flex label place-self-start place-items-center space-x-2 w-full">
					<span>Rue</span>
					{#each createFacility.fields.street.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
					<input
						class="input {geocoder ? 'hidden' : ''} {inputClass.street}"
						name="street"
						type="text"
						placeholder=""
						bind:value={street}
						oninput={() => {
							validateStreet(street, inputClass, isRequired, validateForm);
						}}
					/>
				</label>

				<label class="{street ? '' : 'hidden'} flex label place-self-start place-items-center space-x-2 w-full">
					<span>Complément géographique</span>
					{#each createFacility.fields.geographical_complement.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
					<input
						oninput={() => {}}
						class="input {street ? '' : 'hidden'} {inputClass.geographical_complement}"
						name="geographical_complement"
						type="text"
						placeholder=""
						bind:value={geographical_complement}
					/>
				</label>
				<label class="{geocoder && !$addressFeature?.properties.postcode ? 'hidden' : ''} flex label place-self-start place-items-center space-x-2">
					<span>Code postal</span>
					{#each createFacility.fields.zip.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
					<input
						class="input {geocoder && !$addressFeature?.properties.postcode ? 'hidden' : ''}"
						readonly={geocoder && !!$addressFeature?.properties.postcode}
						name="zip"
						type="text"
						placeholder=""
						bind:value={zip}
					/>
				</label>
				<label class="{street ? '': 'hidden'} flex label place-self-start place-items-center space-x-2 w-full">
					<span>Nom</span>
					{#each createFacility.fields.name.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
					<input
						oninput={() => {}}
						class="input {street ? '': 'hidden'} {inputClass.name}"
						name="name"
						type="text"
						placeholder="Nom complet officiel"
						bind:value={name}
						onchange={() => {
							validateName(name, inputClass, isRequired, validateForm, true);
						}}
					/>
				</label>
				<label class="{name.length > 20 ? '' : 'hidden'} flex label place-self-start place-items-center space-x-2 w-full">
					<span>Label</span>
					{#each createFacility.fields.label.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
					<input
						oninput={() => {}}
						class="input {name.length > 30 ? '' : 'hidden'} {inputClass.label}"
						name="label"
						type="text"
						placeholder="Nom abrégé pour affichage"
						bind:value={label}
						onchange={() => {
							validateLabel(label, inputClass, isRequired, validateForm);
						}}
					/>
				</label>
			</div>
			{#if showMap}
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
			{/if}
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
						selectFacility();
						facilityCreateOpen = false;
						history.back();
					}}>{formResult?.success ? 'Fermer' : 'Annuler'}</button
				>
			</div>
		</div>
	</form>
</div>
