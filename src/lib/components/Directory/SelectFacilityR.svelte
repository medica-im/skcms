<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { FacilityOf } from '$lib/interfaces/facility.interface.ts';
	import type { SelectType } from '$lib/interfaces/select';
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import { getSelectFacility, getFacilityChoice } from './context.ts';
	import * as m from '$msgs';

	let { facilityOf }: { facilityOf: FacilityOf[] } = $props();

	let selectFacility = getSelectFacility();
	let facilityChoice = getFacilityChoice();

	const label = 'label';
	const itemId = 'value';

	function getItems(facilities: FacilityOf[]) {
		if (!facilities) return;
		return facilities
			.map(function (x) {
				const name = x.label || x.name || 'Étbl.';
				const label = `${name} | ${x.street} | ${x.city}`;
				return { value: x.uid, label: label, city: x.city };
			})
			.sort(function (a, b) {
				return a.city.localeCompare(b.city) || a.label.localeCompare(b.label);
			});
	}

	const selectionFromUrl: SelectType | null = $derived.by(() => {
		const facilityUid = page.url.searchParams.get('facility');
		if (!facilityUid || !facilityOf) return null;
		const facility = facilityOf.find((e) => e.uid == facilityUid);
		if (!facility) return null;
		return { label: facility.name, value: facilityUid };
	});

	$effect(() => {
		const sel = selectionFromUrl;
		if (sel) {
			$selectFacility = sel.value;
			$facilityChoice = sel;
		} else {
			$selectFacility = null;
			$facilityChoice = null;
		}
	});

	function handleChange(event: CustomEvent) {
		if (event.detail) {
			const url = new URL(page.url);
			url.searchParams.set('facility', event.detail.value);
			goto(`${url.pathname}?${url.searchParams}`, { noScroll: true, keepFocus: true });
		}
	}

	function handleClear(event: CustomEvent) {
		if (event.detail) {
			const url = new URL(page.url);
			url.searchParams.delete('facility');
			const newUrl = url.searchParams.toString() ? `${url.pathname}?${url.searchParams}` : url.pathname;
			goto(newUrl, { noScroll: true, keepFocus: true });
		}
	}
</script>

<!--facilityChoice: {JSON.stringify(facilityChoice)}<br>
	selectFacility: {$selectFacility}<br />
	facilityOf: {JSON.stringify(facilityOf)} ({facilityOf.length})-->
<div class="text-surface-700 z-auto svelte-select">
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
			value={selectionFromUrl}
		><NoOptions slot="empty" /></Select>
	{/if}
</div>
