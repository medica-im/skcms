<script lang="ts">
	import { getContext } from 'svelte';
	import { getSelectSituation } from './context.ts';
	import { scrollY } from '$lib/store/scrollStore.ts';
	import { variables } from '$lib/utils/constants.ts';
	import Spinner from '$lib/Spinner/Spinner.svelte';
	import SearchDirectory from '$lib/components/Directory/SearchDirectory.svelte';
	import SelectCommunes from '$lib/components/Directory/SelectCommunesR.svelte';
	import SelectCategories from '$lib/components/Directory/SelectCategoriesR.svelte';
	import SelectDepartments from '$lib/components/Directory/SelectDepartmentsR.svelte';
	import SelectCategoriesChips from '$lib/components/Directory/SelectCategoriesChips.svelte';
	import SelectSituations from '$lib/components/Directory/SelectSituations.svelte';
	import SelectTags from '$lib/components/Directory/SelectTagsR.svelte';
	import SelectFacility from '$lib/components/Directory/SelectFacilityR.svelte';
	import List from '$lib/components/Directory/List.svelte';
	import Geocoder from '$lib/components/Geocoder/Geocoder.svelte';
	import Fa from 'svelte-fa';
	import { faArrowsUpToLine } from '@fortawesome/free-solid-svg-icons';
	import type { Loadable } from '@square/svelte-store';
	import type { FacilityOf } from '$lib/interfaces/facility.interface.ts';
	import type { Type, Tag } from '$lib/store/directoryStoreInterface.ts';
	import type { Commune } from '$lib/interfaces/geography.interface.ts';
	let {
		data,
		displayCommune,
		displayDepartment,
		displayCategory,
		displayFacility,
		displayGeocoder,
		displayOrganization,
		displaySearch,
		displaySituation,
		displayTag,
		avatar = true,
		communeOf,
		departmentOf,
		categoryOf,
		facilityOf,
		tagOf,
	}: {
		data: any;
		displayCategory: boolean;
		displayCommune: boolean;
		displayDepartment: boolean;
		displayFacility: boolean;
		displayGeocoder: boolean;
		displayOrganization: boolean;
		displaySearch: boolean;
		displaySituation: boolean;
		displayTag: boolean;
		avatar: boolean;
		communeOf: Commune[];
		departmentOf: string[];
		categoryOf: Type[];
		facilityOf: FacilityOf[];
		tagOf: Tag[];
	} = $props();
	const cCFE = getContext<Loadable<Map<any, any>>>('cardinalCategorizedFilteredEffectors');
	const selectSituation = getSelectSituation();
	let top: Element;
	let showOnPx = 500;
	const scrollToTop = () => {
		top.scrollIntoView();
	};
</script>

<svelte:window bind:scrollY={$scrollY} />

<section class="bg-surface-100-800-token programs-gradient">
	<div class="section-container" bind:this={top}>
		<div class="grid grid-cols-1 gap-1">
			{#if displayGeocoder}
				<Geocoder />
			{/if}
			{#if displaySituation}
				<SelectSituations />
			{/if}
			{#if displayDepartment}
				<SelectDepartments {departmentOf} />
			{/if}
			{#if displayCommune}
				<SelectCommunes {communeOf} />
			{/if}
			{#if displayCategory}
				{#if $selectSituation}
					<SelectCategoriesChips {categoryOf} />
				{:else}
					<SelectCategories {categoryOf} />
				{/if}
			{/if}
			{#if displayTag}
				<SelectTags {tagOf} />
			{/if}
			{#if displayFacility}
				<SelectFacility {facilityOf} />
			{/if}
			{#if displaySearch}
				<SearchDirectory />
			{/if}
			<div class="my-4 space-y-4">
				{#await cCFE.load()}
					{#if data && [...data]?.length}
						<List {data} {avatar} loading={true} />
					{:else}
						<div class="flex justify-center m-2 space-x-2 items-center">
							<Spinner w={4} h={4} />
							<p>Chargement...</p>
						</div>
					{/if}
				{:then}
					<List data={$cCFE} {avatar} loading={false} />
				{/await}
			</div>
		</div>
	</div>
</section>

{#if $scrollY > showOnPx}
	<button
		type="button"
		title="Revenir en haut de la page"
		aria-label="Revenir en haut de la page"
		class="back-to-top btn-icon btn-lg variant-ghost"
		onclick={scrollToTop}
	>
		<Fa icon={faArrowsUpToLine} size="lg" /></button
	>
{/if}

<style lang="postcss">
	.anchordiv {
		scroll-margin-top: 1rem;
	}
	.section-container {
		@apply mx-auto w-full max-w-7xl p-4 md:py-8;
		scroll-padding-top: 4rem;
	}
	.programs-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 100% 0%, rgba(var(--color-primary-500) / 0.33) 0px, transparent 50%);
	}
	.back-to-top {
		position: fixed;
		z-index: 99;
		right: 15px;
		user-select: none;
		bottom: 15px;
	}
</style>
