<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { updateFacility } from '../../../facility.remote.ts';
	import { faCheck, faPenToSquare, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { JsonView } from '@zerodevx/svelte-json-view';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
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
	class="btn variant-ghost-surface"
	title="Créer"
	><span><Fa icon={faPenToSquare} /></span><span>Modifier l'établissement</span></button
>

<Dialog bind:dialog classProp="w-full">
	<div class="rounded-lg w-full p-4 variant-ghost-secondary items-center place-items-center">
		<h3 class="h3 text-center">Modifier l'établissement</h3>
		<form
			{...updateFacility.for(uid).enhance(async ({ form, data, submit }) => {
				console.log(data);
				try {
					await submit();
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
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Nom</span>
						{#each updateFacility.for(uid).fields.name.issues() as issue}
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
								validateName(name, inputClass, isRequired, validateForm);
							}}
						/>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Label</span>
						{#each updateFacility.for(uid).fields.label.issues() as issue}
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
						{#each updateFacility.for(uid).fields.slug.issues() as issue}
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
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Bâtiment</span>
						{#each updateFacility.for(uid).fields.building.issues() as issue}
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
						{#each updateFacility.for(uid).fields.street.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							oninput={() => {}}
							class="input {inputClass.street}"
							name="street"
							type="text"
							placeholder=""
							bind:value={street}
							onchange={() => {
								validateStreet(street, inputClass, isRequired, validateForm);
							}}
						/>
					</label>

					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Complément géographique</span>
						{#each updateFacility.for(uid).fields.geographical_complement.issues() as issue}
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
						{#each updateFacility.for(uid).fields.zip.issues() as issue}
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
						{#each updateFacility.for(uid).fields.zoom.issues() as issue}
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
							onchange={() => {
								validateZoom(zoom, inputClass, isRequired, validateForm);
							}}
						/>
					</label>
					<AddMarkerMap bind:lng bind:lat bind:zoom />
					<label class="flex label place-self-start place-items-center space-x-2">
						<span>Latitude</span>
						<input name="latitude" class="input" bind:value={lat} />
						{#each updateFacility.for(uid).fields.latitude.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
					</label>
					<label class="flex label place-self-start place-items-center space-x-2">
						<span>Longitude</span>

						<input name="longitude" class="input" bind:value={lng} />
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
						onclick={() => {
							dialog?.close();
							if (formResult?.success && page.url.pathname.startsWith('/web')) {
								facility = formResult.data;
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
