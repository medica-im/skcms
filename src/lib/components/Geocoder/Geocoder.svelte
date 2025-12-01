<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as m from '$msgs';
	import { normalize } from '$lib/helpers/stringHelpers';
	import { faAddressCard } from '@fortawesome/free-regular-svg-icons';
	import Fa from 'svelte-fa';
	import DocsIcon from '$lib/Icon/Icon.svelte';
	import SelectAddress from '$lib/Web/SelectAddress.svelte';
	import { getAddressFeature, getGeoInputAddress } from '../Directory/context';
	import type { AddressFeature, FeatureCollection } from '$lib/store/directoryStoreInterface';

	let {
		commune = null,
	    placeholder = "Adresse de l’usager",
		inputClass = '',
		limitToZip = true,
	}: {
		commune?: string|null;
		placeholder?: string;
		inputClass?: string;
		limitToZip?: boolean;
	} = $props();

	let addressFeature = getAddressFeature();
	let inputAddress = getGeoInputAddress();

	type SelectOption = {value: AddressFeature, label: string};

	let addressOptions: SelectOption[] = $state([]);

	const options = {
		url: 'https://api-adresse.data.gouv.fr/search/?',
		minChar: 3,
		limit: 20,
		submitDelay: 300,
		includePosition: false,
		feedbackEmail: null // Set to null to remove feedback box
	};

	let visible = $derived(!$addressFeature && !($inputAddress==null) && $inputAddress.length > options.minChar);

	const getLabel = (address: AddressFeature) => {
		return `${address.properties.housenumber} ${address.properties.street}${commune ? '' : ' [' + address.properties.city +']'}`
	}

	function getAddressOptions(res: FeatureCollection) {
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
				if ( limitToZip === false ) {
					return true
				} else {
					return page.data?.directory?.postal_codes.length ? page.data.directory.postal_codes.includes(e.properties.postcode.substring(0,2)) : true
				}
			})
			.map((e: AddressFeature) => {
				return { label: getLabel(e), value: e };
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
			q: `${$inputAddress} ${commune ?? ''}`,
			limit: options.limit,
			lat: null,
			lon: null
		};
		return params;
	}

	async function fetchGeojson() {
		if ( $addressFeature ) {
			return
		}
		if ( $inputAddress && $inputAddress?.length < options.minChar ) {
			return
		}
		let url = options.url + buildQueryString();
		const res = await fetch(url, {
			method: 'GET',
			mode: 'cors'
		});
		if (!res.ok) {
			const message = `An error has occured: ${res.status}`;
			throw new Error(message);
		} else {
			const geojson = await res.json();
			//response = geojson;
			addressOptions = getAddressOptions(geojson);
		}
	}

    $effect(()=>{
		if ($addressFeature) {
			if (commune) {
				$inputAddress = $addressFeature.properties.name
			} else {
				const city = `[${$addressFeature.properties.city}]`;
				$inputAddress = `${$addressFeature.properties.name} ${city}`; 
			}
		}
	});

	function handleClear() {
		$inputAddress = null;
		$addressFeature = null;
		if (page.url.searchParams.get('address')) {
			page.url.searchParams.delete('address');
			goto(page.url.pathname + '?' + page.url.searchParams);
		}
	}
	onMount(async () => {
		const addressParam: string | null = page.url.searchParams.get('address');
		if (addressParam) {
		    $addressFeature = JSON.parse(addressParam);
		}
	});
</script>
<!--visible: {visible}<br>
{JSON.stringify(addressOptions)}<br>
$addressFeature: {JSON.stringify($addressFeature)}-->
<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
	<div class="input-group-shim m-0"><Fa icon={faAddressCard} /></div>
	<input
		class="input {inputClass}"
		type="search"
		name="geocoder"
		autocomplete="off"
		disabled={Boolean($addressFeature)}
		placeholder={placeholder}
		oninput={()=>{fetchGeojson()}}
		bind:value={$inputAddress}
		aria-label={m.ADDRESSBOOK_GEOCODER_ARIA_LABEL()}
	/>
	<button
		class="variant-filled-secondary"
		onclick={handleClear}
		aria-label={m.ADDRESSBOOK_CLEAR()}
		disabled={!$inputAddress}
	>
		<DocsIcon name="clear" width="w-5" height="h-5" />
	</button>
</div>
		{#if visible}
		<SelectAddress {addressOptions} bind:visible bind:addressFeature={$addressFeature} />
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
