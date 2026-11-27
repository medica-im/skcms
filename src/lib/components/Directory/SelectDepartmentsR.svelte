<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Select from '#lib/Web/Select.svelte';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { getSelectedDepartment } from './context';
	import { getDepartments } from '#lib/Web/data.ts';
	import type { DepartmentOfFrance } from '#lib/interfaces/v2/facility.ts';
	import type { SelectType } from '#lib/interfaces/select.ts';

	let { departmentOf }: { departmentOf: string[] } = $props();

	let departments: DepartmentOfFrance[] | undefined = $state(undefined);
	let items = $derived.by(() => {
		if (departments && departments?.length) {
			return departments
				.filter((d) => departmentOf.includes(d.code))
				.map((d) => {
					const label = `${d.name} - ${d.code}`;
					return { label: label, value: d.code };
				});
		}
	});
	let selectDepartment = getSelectedDepartment();
	const label = 'label';
	const itemId = 'value';

	function getValue(dptCode: string): SelectType | null {
		if (departments) {
			const found = departments.find((d) => dptCode === d.code);
			if (found) {
				return { label: found.name, value: found.code };
			}
		}
		return null;
	}

	onMount(async () => {
		departments = await getDepartments();
	});

	const selectionFromUrl: SelectType | null = $derived.by(() => {
		const dptParam = page.url.searchParams.get('department');
		if (!dptParam || !departments) return null;
		const dptCode: string = JSON.parse(dptParam);
		return getValue(dptCode);
	});

	$effect(() => {
		selectDepartment.set(selectionFromUrl);
	});

	function handleChange(selected: SelectType | undefined) {
		if (selected) {
			const url = new URL(page.url.href);
			url.searchParams.set('department', JSON.stringify(selected.value));
			goto(`${url.pathname}?${url.searchParams}`, { reset: false });
		}
	}

	const handleClear = (cleared: unknown) => {
		if (cleared) {
			const url = new URL(page.url.href);
			url.searchParams.delete('department');
			const newUrl = url.searchParams.toString() ? `${url.pathname}?${url.searchParams}` : url.pathname;
			goto(newUrl, { reset: false });
		}
	};
</script>

<div class="text-surface-700 svelte-select max-h-12">
	{#if !departmentOf}
		<Select loading={true} placeholder={m.ADDRESSBOOK_DEPARTMENTS_PLACEHOLDER()} />
	{:else}
		<Select
			fitOnPhone={true}
			{label}
			{itemId}
			{items}
			searchable={true}
			onchange={handleChange}
			onclear={handleClear}
			placeholder={m.ADDRESSBOOK_DEPARTMENTS_PLACEHOLDER()}
			value={selectionFromUrl}
		/>
	{/if}
</div>
