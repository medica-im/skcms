<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { getSelectedDepartments } from './context';
	import { getDepartments } from '$lib/Web/data';
	import type { DepartmentOfFrance } from '$lib/interfaces/v2/facility';
	import type { SelectType } from '$lib/interfaces/select';

	let { departmentOf }: { departmentOf: string[] } = $props();

	const departments: DepartmentOfFrance[] | undefined = $derived(await getDepartments());
	let items = $derived.by(() => {
		return departments
			.filter((d) => departmentOf.includes(d.code))
			.map((d) => {
				return { label: d.name, value: d.code };
			});
	});
	let selectDepartments = getSelectedDepartments();
	let value: SelectType | SelectType[] | undefined = $derived.by(() => {
		if ($selectDepartments === null) {
			return undefined;
		} else {
			const _value = getValue($selectDepartments);
			if (!_value) return;
			if (multiple) {
				return _value;
			} else {
				return _value[0];
			}
		}
	});
	let multiple: boolean = $state(false);
	const label = 'label';
	const itemId = 'value';

	//let selectedCommunesChoices = getSelectedCommunesChoices();
	/*let value: SelectType | SelectType[] | undefined = $derived.by(() => {
		if (multiple) {
			return $selectedCommunesChoices || undefined;
		} else {
			return $selectedCommunesChoices ? $selectedCommunesChoices[0] : undefined;
		}
	});*/
	function getValue(dptsCodes: string[]) {
		if ( departments ) {
		return departments.filter((d) => {
				return dptsCodes.includes(d.code);
			})
			.map((d) => {
				return { label: d.name, value: d.code };
			});
		}
	}

	onMount(() => {
		const dptsParam = page.url.searchParams.get('departments');
		console.log('dptsParam', dptsParam);
		if (!dptsParam) return;
		const dptsCodes: string[] = JSON.parse(dptsParam);
		selectDepartments.set(dptsCodes);
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

	function handleClear(event: CustomEvent) {
		if (event.detail) {
			$selectDepartments = null;
			//$selectedCommunesChoices = null;
			if (page.url.searchParams.get('communes')) {
				page.url.searchParams.delete('communes');
				goto(page.url.pathname + '?' + page.url.searchParams);
			}
		}
	}

	function handleChange(event: CustomEvent) {
		if (event.detail) {
			console.log(event.detail);
			if (Array.isArray(event.detail)) {
				//$selectedCommunesChoices = event.detail;
				$selectDepartments = event.detail.map((e) => e.value);
			} else {
				console.log(event.detail.value);
				//$selectedCommunesChoices = [event.detail];
				selectDepartments.set([event.detail.value]);
				console.log($selectDepartments);
			}
		}
	}
</script>

<!--
{departmentOf ? JSON.stringify(departmentOf.slice(0, 2)) : departmentOf}<br />
{departmentOf ? departmentOf?.length : 0} commune(s)<br />
$selectDepartments: {JSON.stringify($selectDepartments)}<br />
typeof $selectDepartments: {typeof $selectDepartments}<br />
-->
<div class="text-surface-700 theme max-h-12">
	{#if !departmentOf}
		<Select loading={true} placeholder={m.ADDRESSBOOK_DEPARTMENTS_PLACEHOLDER()} />
	{:else}
		<Select
			{label}
			{itemId}
			{items}
			searchable={true}
			on:change={handleChange}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_DEPARTMENTS_PLACEHOLDER()}
			bind:value
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
