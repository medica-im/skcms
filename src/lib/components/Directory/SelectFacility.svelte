<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { FacilityOf } from '$lib/interfaces/facility.interface.ts';
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import { getFacilities } from '$lib/store/facilityStore';
	import { getSelectFacility } from './context.ts';
	import * as m from '$msgs';
	import type { Loadable } from '@square/svelte-store';

	let { facilityOf }: { facilityOf: Loadable<FacilityOf[]> } = $props();

	let selectFacility = getSelectFacility();
	let facilityChoice: { label: string; value: string } | undefined = $state();

	$effect(() => {
		if ($selectFacility == null) {
			facilityChoice = undefined;
		}
	});

	const label = 'label';
	const itemId = 'value';

	let facilityParam: string | null = null;

	onMount(async () => {
		facilityParam = page.url.searchParams.get('facility');
		if (facilityParam) {
			selectFacility.set(facilityParam);
			const facilities = await facilityOf.load();
			if (facilities) {
				const value = getValue(facilityParam, facilities);
				if (value) {
					facilityChoice = value;
				}
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

	async function getItems(facilities: FacilityOf[]) {
		return facilities.map(function (x) {
				const name = x.label || x.name || "Étbl.";
				const label = `${name} | ${x.street} | ${x.city}`;
				let dct = { value: x.uid, label: label, city: x.city };
				return dct;
			}).sort(function (a, b) {
				return a.city.localeCompare(b.city) || a.label.localeCompare(b.label);
			})
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
<!--{JSON.stringify($facilityOf)}-->
{#await facilityOf.load()}
	<div class="text-surface-700 theme">
		<Select loading={true} placeholder={m.ADDRESSBOOK_FACILITIES_PLACEHOLDER()} />
	</div>
{:then}
	<!--
	facilityChoice: {JSON.stringify(facilityChoice)}<br>
	selectFacility: {$selectFacility}<br />
	facilities: {$getFacilities} ({$getFacilities.length})<br />
	facilityOf: {$facilityOf} ({$facilityOf.length})
-->
	<div class="text-surface-700 z-auto theme">
		<Select
			{label}
			{itemId}
			items={await getItems($facilityOf)}
			searchable={true}
			on:change={handleChange}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_FACILITIES_PLACEHOLDER()}
			bind:value={facilityChoice}
		/>
	</div>
{/await}

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
