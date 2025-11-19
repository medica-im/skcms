<script lang="ts">
    import { getContext } from 'svelte';
    import { getSelectSituation } from './context.ts';
   	import { scrollY } from '$lib/store/scrollStore.ts';
    import { variables } from '$lib/utils/constants.ts';
    import Spinner from '$lib/Spinner/Spinner.svelte';
    import SearchDirectory from '$lib/components/Directory/SearchDirectory.svelte';
	import SelectCommunes from '$lib/components/Directory/SelectCommunes.svelte';
	import SelectCategories from '$lib/components/Directory/SelectCategories.svelte';
	import SelectCategoriesChips from '$lib/components/Directory/SelectCategoriesChips.svelte';
	import SelectSituations from '$lib/components/Directory/SelectSituations.svelte';
	import SelectFacility from '$lib/components/Directory/SelectFacility.svelte';
	import List from '$lib/components/Directory/List.svelte';
	import Geocoder from '$lib/components/Geocoder/Geocoder.svelte';
	import Fa from 'svelte-fa';
	import { faArrowsUpToLine } from '@fortawesome/free-solid-svg-icons';
    import type { Loadable } from '@square/svelte-store';
	import type { FacilityOf } from '$lib/interfaces/facility.interface.ts';

    let {
		data = null,
		displayGeocoder = variables.INPUT_GEOCODER,
		displaySituation = variables.INPUT_SITUATION,
		displayCommune = variables.INPUT_COMMUNE,
		displayCategory = variables.INPUT_CATEGORY,
		displayFacility = variables.INPUT_FACILITY,
		displaySearch = variables.INPUT_SEARCH,
		avatar = true,
		communeOf,
		categoryOf,
		facilityOf,
		types = null
	} : {
		data: any;
 		displayGeocoder: boolean;
		displaySituation: boolean;
		displayCommune: boolean;
		displayCategory: boolean;
		displayFacility: boolean;
		displaySearch: boolean;
		avatar: boolean;
    	communeOf: any;
    	categoryOf: any;
    	facilityOf: Loadable<FacilityOf[]>;
		types: string[]|null;
	} = $props();

    const cCFE = getContext<Loadable<Map<any,any>>>('cardinalCategorizedFilteredEffectors');
    const selectSituation = getSelectSituation();
    let top: Element;
	let showOnPx = 500;
	function contactCount(_categorizedFilteredEffectors: Map<string, any>) {
		let count = 0;
		if (_categorizedFilteredEffectors) {
			count = [..._categorizedFilteredEffectors.values()].flat().length;
		}
		return `${count} contact${count > 1 ? 's' : ''}`;
	}
	const scrollToTop = () => {
		top.scrollIntoView();
	};
</script>

<svelte:window bind:scrollY={$scrollY} />

	<section class="bg-surface-100-800-token programs-gradient">
		<div class="section-container" bind:this={top}>
			<div class="space-y-2">
				{#if displayGeocoder}
					<div class="row">
						<div class="col">
							<Geocoder />
						</div>
					</div>
				{/if}
				{#if displaySituation}
					<div class="row">
						<div class="col">
							<SelectSituations />
						</div>
					</div>
				{/if}
				{#if displayCommune}
					<div class="row">
						<div class="col">
							<SelectCommunes {communeOf} />
						</div>
					</div>
				{/if}
				{#if displayCategory}
					{#if $selectSituation}
						<div class="row">
							<div class="col">
								<SelectCategoriesChips {categoryOf} />
							</div>
						</div>
					{:else}
						<div class="row">
							<div class="col">
								<SelectCategories {categoryOf} />
							</div>
						</div>
					{/if}
				{/if}
				{#if displayFacility}
					<div class="row">
						<div class="col">
							<SelectFacility {facilityOf} />
						</div>
					</div>
				{/if}
				{#if displaySearch}
					<div class="row">
						<div class="col">
							<SearchDirectory />
						</div>
					</div>
				{/if}
				<div class="my-4 space-y-4">
					
					{#await cCFE.load()}
						{#if data && [...data]?.length}
							<List {data} {avatar} loading={true}/>
						{:else}
							<div class="flex justify-center m-2 space-x-2 items-center">
								<Spinner w={4} h={4} />
								<p>Chargement...</p>
							</div>
						{/if}
					{:then}
					<List data={$cCFE} {avatar} loading={false}/>
					{/await}
				</div>
			</div>
		</div>
	</section>

{#if $scrollY > showOnPx}
	<button type="button" title="Revenir en haut de la page" aria-label="Revenir en haut de la page" class="back-to-top btn-icon btn-lg variant-ghost" onclick={scrollToTop}>
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
		background-image: radial-gradient(
				at 0% 0%,
				rgba(var(--color-secondary-500) / 0.33) 0px,
				transparent 50%
			),
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