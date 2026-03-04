<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { getSelectedDepartment } from './context';
	import { getDepartments } from '$lib/Web/data';
	import type { DepartmentOfFrance } from '$lib/interfaces/v2/facility';

	let { departmentOf }: { departmentOf: string[] } = $props();

	let departments: DepartmentOfFrance[] | undefined = $state(undefined);
	let items = $derived.by(() => {
		if ( departments && departments?.length ) {
			return departments
				.filter((d) => departmentOf.includes(d.code))
				.map((d) => {
					const label = `${d.name} - ${d.code}`;
					return { label: label, value: d.code };
				})
		}
	});
	let selectDepartment = getSelectedDepartment();
	const label = 'label';
	const itemId = 'value';

	function getValue(dptCode: string) {
		if ( !(departments === undefined) ) {
			const found = departments.find((d) => {
				return dptCode===d.code;
			})
			if (found) {
				return { label: found.name, value: found.code };
			}
		}
		return null
	}

	onMount(async () => {
		departments = await getDepartments();
		const dptParam = page.url.searchParams.get('department');
		if (!dptParam) return;
		const dptCode: string = JSON.parse(dptParam);
		if ($selectDepartment?.value !== dptCode) {
			const value = getValue(dptCode);
			selectDepartment.set(value);
		}
	});

	/*function getChoices(communeUids: string[], allCommunes: Commune[]) {
		const choices = allCommunes
			.filter((x) => communeUids.includes(x.uid))
			.map(function (x) {
				let dct = { value: x.uid, label: x.name };
				return dct;
			});
		return choices;
	}*/

	const handleClear = (event: CustomEvent) => {
		if (event.detail) {
			if (page.url.searchParams.get('department')) {
				page.url.searchParams.delete('department');
				goto(page.url.pathname + '?' + page.url.searchParams);
			}
		}
	};
</script>

<div class="text-surface-700 svelte-select max-h-12">
	{#if !departmentOf}
		<Select loading={true} placeholder={m.ADDRESSBOOK_DEPARTMENTS_PLACEHOLDER()} />
	{:else}
		<Select
			{label}
			{itemId}
			{items}
			searchable={true}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_DEPARTMENTS_PLACEHOLDER()}
			bind:value={$selectDepartment}
		><NoOptions slot="empty" /></Select>
	{/if}
</div>
