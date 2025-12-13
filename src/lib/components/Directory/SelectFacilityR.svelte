<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { FacilityOf } from '$lib/interfaces/facility.interface.ts';
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import { getFacilities } from '$lib/store/facilityStore';
	import { getSelectFacility, getFacilityChoice } from './context.ts';
	import * as m from '$msgs';

	let { facilityOf }: { facilityOf: FacilityOf[] } = $props();


	let selectFacility = getSelectFacility();
	let facilityChoice = getFacilityChoice();

	const label = 'label';
	const itemId = 'value';

	let facilityParam: string | null = null;

	onMount(async () => {
		facilityParam = page.url.searchParams.get('facility');
		if (facilityParam) {
			selectFacility.set(facilityParam);
				const value = getValue(facilityParam, facilityOf);
				if (value) {
					$facilityChoice = value;
				}
		}
	});

	function getValue(facilityUid: string, facilities: FacilityOf[]) {
		if (facilities != undefined) {
			const facility = facilities.find((e) => e.uid == facilityUid);
			if (facility) {
				const label = facility.name;
				return { label: label, value: facilityUid };
			}
		}
	}

	function getItems(facilities: FacilityOf[]) {
		if ( !facilities ) return
		return facilities
			.map(function (x) {
				const name = x.label || x.name || 'Étbl.';
				const label = `${name} | ${x.street} | ${x.city}`;
				let dct = { value: x.uid, label: label, city: x.city };
				return dct;
			})
			.sort(function (a, b) {
				return a.city.localeCompare(b.city) || a.label.localeCompare(b.label);
			});
	}

	function handleClear(event: CustomEvent) {
		if (event.detail) {
			selectFacility.set(null);
			if (page.url.searchParams.get('facility')) {
				page.url.searchParams.delete('facility');
				goto(page.url.pathname + '?' + page.url.searchParams);
			}
		}
	}

	function handleChange(event: CustomEvent) {
		if (event.detail) {
			selectFacility.set(event.detail.value);
		}
	}
</script>

	<!--facilityChoice: {JSON.stringify(facilityChoice)}<br>
	selectFacility: {$selectFacility}<br />
	facilityOf: {$facilityOf} ({$facilityOf.length})-->
	<div class="text-surface-700 z-auto theme">
		{#if !facilityOf}
		<Select loading={true} placeholder={m.ADDRESSBOOK_FACILITIES_PLACEHOLDER()} />
		{:else}
		<Select
			{label}
			{itemId}
			items={getItems(facilityOf)}
			searchable={true}
			on:change={handleChange}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_FACILITIES_PLACEHOLDER()}
			bind:value={$facilityChoice}
		/>
		{/if}
	</div>

<style>
	/*
			CSS variables can be used to control theming.
			https://github.com/rob-balfre/svelte-select/blob/master/docs/theming_variables.md
	*/
	.theme {
		--border-radius: var(--theme-rounded-container);
		--border-color: rgb(var(--color-secondary-500));
		--border-focused: 1px solid rgb(var(--color-secondary-500));
		--border-hover: 1px solid rgb(var(--color-secondary-500));
		--item-active-outline: 1px solid rgb(var(--color-secondary-500));
		--item-outline: 1px solid rgb(var(--color-secondary-500));
		--clear-select-focus-outline: 1px solid rgb(var(--color-secondary-500));
		--height: 3rem;
	}
</style>
