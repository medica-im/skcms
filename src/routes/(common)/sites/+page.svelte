<script lang="ts">
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { language } from '$lib/store/languageStore';
	import { page } from '$app/state';
	import FacilityCard from '$lib/Facility/FacilityCard.svelte';
	import type { Facility } from '$lib/interfaces/facility.interface.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const count = $derived(data.facilities.length);

	function getEntries(uid: string) {
		return data.entryMap.get(uid);
	}

	const getHeader = () => {
		return count < 2 ? 'Notre établissement' : `Nos ${count} établissements`;
	};
	const getTitle = () => {
		return count < 2 ? 'Établissement' : 'Établissements';
	};
</script>

<svelte:head>
	<title>
		{getTitle()} - {capitalizeFirstLetter(page.data.organization.formatted_name, $language)}
	</title>
</svelte:head>
<header id="hero" class="bg-surface-100-800-token hero-gradient">
	<div class="section-container">
		<h2 class="h2">
			{getHeader()}
		</h2>
	</div>
</header>

<div>
	<!-- programs -->
	<section id="programs" class="bg-surface-100-800-token programs-gradient">
		<div class="section-container">
			<div class="lg:hidden logo-cloud grid-cols-1 gap-0.5">
				{#each data.facilities as facility}
					<a href="#{facility.name}_anchor" class="logo-item p-2">{facility.name}</a>
				{/each}
			</div>
			<div class="grid lg:grid-cols-2 gap-6">
				{#each data.facilities as facility}
					<FacilityCard {facility} entries={getEntries(facility.uid)} />
				{/each}
			</div>
		</div>
	</section>
</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto flex w-full max-w-7xl space-y-6 px-6 py-6 md:py-8 justify-center;
	}
	/* Hero Gradient */
	/* prettier-ignore */
	.hero-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 98% 1%, rgba(var(--color-error-500) / 0.33) 0px, transparent 50%);
	}
	/* Team Gradient */
	/* prettier-ignore */
	.team-gradient {
		background-image:
			radial-gradient(at 0% 100%, rgba(var(--color-secondary-500) / 0.50) 0px, transparent 50%);
	}
	/* Tailwind Gradient */
	/* prettier-ignore */
	.tailwind-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.50) 0px, transparent 50%),
			radial-gradient(at 100% 100%,  rgba(var(--color-primary-500) / 0.24) 0px, transparent 50%);
	}
	/* Programs Gradient */
	/* prettier-ignore */
	.programs-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 100% 0%,  rgba(var(--color-primary-500) / 0.33) 0px, transparent 50%);
	}
</style>
