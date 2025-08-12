<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { normalize } from '$lib/helpers/stringHelpers';
	import { faAddressCard } from '@fortawesome/free-regular-svg-icons';
	import Fa from 'svelte-fa';
	import DocsIcon from '$lib/Icon/Icon.svelte';
	import { PUBLIC_DIRECTORY_TTL } from '$env/static/public';
	import SelectAddress from '$lib/Web/SelectAddress.svelte';
	import type { AddressFeature, FeatureCollection } from '$lib/store/directoryStoreInterface';

	let {
		addressFeature = $bindable(),
		commune = null,
	    placeholder = '',
		inputClass = ''
	}: {
		addressFeature?: AddressFeature | undefined;
		commune?: string|null,
		placeholder?: string,
		inputClass?: string
	} = $props();

	let addressValue: string|null = $state(null);
	let visible: boolean = $state(false);
	let response: FeatureCollection|undefined = $state();
	const cachelife: number = parseInt(PUBLIC_DIRECTORY_TTL || '0');

	type SelectOption = {value: string, label: string};

	let addressOptions: SelectOption[] = $state([]);

	const options = {
		url: 'https://api-adresse.data.gouv.fr/search/?',
		minChar: 3,
		limit: 20,
		submitDelay: 300,
		includePosition: false,
		feedbackEmail: null // Set to null to remove feedback box
	};
	//let CURRENT: Integer | null = null;
	//let inputAddress: string = '';
	//let CACHE = '';
	//let RESULTS: Array<Object> = [];
	let inputAddress: string | undefined = $state();

	$effect(() => {
		if (inputAddress && inputAddress.length > options.minChar) {
			response = search();
		}
	});
	$effect(() => {
		visible = !addressFeature && !(inputAddress === undefined) && !(inputAddress==null) && inputAddress.length > options.minChar;
	});

	$effect(() => {
		if (response) {
			addressOptions = getAddressOptions(response);
		}
	});

	const getLabel = (address: AddressFeature) => {
		return `${address.properties.housenumber} ${address.properties.street}${commune ? '' : ' [' + address.properties.city +']'}`
	}

	function getAddressOptions(res: FeatureCollection) {
		console.log(res);
		console.log(JSON.stringify(res));

		if (!res || !res?.features?.length) {
			return [];
		}
		let _addressOptions = res.features
		.filter((e: AddressFeature) => {
			return e.properties.housenumber
		})
			.filter((e: AddressFeature) => {
				return commune? e.properties.city == commune : true;
			})
			.filter((e: AddressFeature)=> {
				return page.data.directory.postal_codes ? page.data.directory.postal_codes.includes(e.properties.postcode.substring(0,2)) : true
			})
			.map((e: AddressFeature) => {
				return { label: getLabel(e), value: e.properties.id };
			});
		return _addressOptions;
	}

	function buildQueryString() {
		let params: object = getParams();
		let query_string = [];
		for (let key in params) {
			if (params[key as keyof object]) {
				query_string.push(
					encodeURIComponent(key) + '=' + encodeURIComponent(params[key as keyof object])
				);
			}
		}
		return query_string.join('&');
	}

	function getParams() {
		let params = {
			q: `${inputAddress} ${commune ?? ''}`,
			limit: options.limit,
			lat: null,
			lon: null
		};
		return params;
	}

	function search(): FeatureCollection|undefined {
		if (inputAddress === '') {
			return;
		}
		if (inputAddress && inputAddress.length < options.minChar) {
			return;
		}
		//if (value + '' === CACHE + '') {
		//	return;
		//} else {
		//	CACHE = value;
		//}
		fetchGeojson();
	}

	async function fetchGeojson() {
		let url = options.url + buildQueryString();
		console.log(`geocoder: ${url}`);
		const res = await fetch(url, {
			method: 'GET',
			mode: 'cors'
		});
		if (!res.ok) {
			const message = `An error has occured: ${res.status}`;
			throw new Error(message);
		}
		const geojson = await res.json();
		response = geojson;
		console.log(response)
	}

	function recordAddressFeature(featureId: string) {
		const feature = response?.features.find((x: AddressFeature) => x.properties.id == featureId);
		addressFeature = feature;
	}

    $effect(()=>{
		if (addressValue && response?.features?.length) {
			const feature: AddressFeature|undefined = response.features.find((x) => x.properties.id == addressValue);
		    addressFeature = feature;
			inputAddress = feature?.properties.name
			if (!commune) {
				const city = `[${feature?.properties.city}]`;
				inputAddress = inputAddress?.concat(" ", city)
			}
		}
	});

	function onAddressSelection(event: any): void {
		inputAddress = event.detail.label;
		recordAddressFeature(event.detail.value);
		visible = false;
	}
	const onInput = () => (visible = true);

	function handleClear() {
		visible = false;
		inputAddress = '';
		addressFeature = undefined;
		addressValue = null;
	}
</script>

<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
	<div class="input-group-shim"><Fa icon={faAddressCard} /></div>
	<input
		class="input {inputClass}"
		type="search"
		name="geocoder"
		autocomplete="off"
		disabled={Boolean(addressFeature)}
		placeholder={placeholder}
		bind:value={inputAddress}
		aria-label={m.ADDRESSBOOK_GEOCODER_ARIA_LABEL()}
	/>
	<button
		class="variant-filled-secondary"
		onclick={handleClear}
		aria-label={m.ADDRESSBOOK_CLEAR()}
		disabled={!inputAddress}
	>
		<DocsIcon name="clear" width="w-5" height="h-5" />
	</button>
</div>
	<!--div class="card w-full max-w-md max-h-48 p-4 overflow-y-auto" tabindex="-1">
		{#key addressOptions}
			<Autocomplete
				bind:input={inputAddress}
				options={addressOptions}
				on:selection={onAddressSelection}
				emptyState={m.SKELETON_AUTOCOMPLETE_EMPTY_STATE()}
			/>
		{/key}
	</div-->
	<!--div class="card w-full max-w-md max-h-48 p-4 overflow-y-auto" tabindex="-1">
		{#key addressOptions}
			<Svelecte
				bind:value={addressValue}
				options={addressOptions}
			/>
		{/key}
		</div-->
		{#if visible}
		<SelectAddress {addressOptions} bind:visible={visible} bind:address={addressValue}  />
		{/if}

<style>
	/* clears the ‘X’ from Internet Explorer */
	input[type='search']::-ms-clear {
		display: none;
		width: 0;
		height: 0;
	}
	input[type='search']::-ms-reveal {
		display: none;
		width: 0;
		height: 0;
	}
	/* clears the ‘X’ from Chrome */
	input[type='search']::-webkit-search-decoration,
	input[type='search']::-webkit-search-cancel-button,
	input[type='search']::-webkit-search-results-button,
	input[type='search']::-webkit-search-results-decoration {
		display: none;
	}
</style>
