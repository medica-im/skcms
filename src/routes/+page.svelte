<script lang="ts">
	import * as m from "$msgs";
	import { browser } from '$app/environment';
	import { variables } from '$lib/utils/constants';
	import { organizationStore } from '$lib/store/facilityStore';
	import { Welcome } from '$lib';
    import { Team } from '$lib';
	import { Ghost } from '$lib';
	import SignupForm from '$lib/Ghost/SignupForm.svelte';
	import OpenGraph from '$lib/components/OpenGraph/OpenGraph.svelte';
	import { language } from '$lib/store/languageStore';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import OutpatientClinicPrograms from '$lib/OutpatientClinicPrograms/OutpatientClinicPrograms.svelte';
	import { programsNavLinks } from '$var/variables.ts';
	import type { PageData } from './$types';
	import LDTag from '$lib/Schema/LDTag.svelte';
	import { Facility } from '$lib';
	import HeatwaveAlert from '$lib/Heatwave/HeatwaveAlert.svelte';
	import Directory from '$lib/components/Directory/CtxDirectory.svelte';

    let { data, form } = $props();
</script>

<!--LDTag schema={data?.websiteSchema} /-->
<svelte:head>
	{#if data?.openGraph}
		<OpenGraph opengraph={data.openGraph} />
	{/if}

	<title>
		{m.ADDRESSBOOK_TITLE()} - {capitalizeFirstLetter($organizationStore.formatted_name, $language)}
	</title>
</svelte:head>

<!-- hero -->
<header id="hero" class="hero-gradient">
	<!--div class="mx-0 flex flex-col items-center justify-center p-4 py-6 space-y-2"-->
	<div class="section-container">

		<h2 class="h2">
			{m.NAVBAR_ADDRESSBOOK()}
		</h2>
	</div>
</header>

	<div>
		<Directory
				data={data?.cardinal}
				propCurrentOrg={null}
				displayCommune={true}
				displayGeocoder={true}
				displayCategory={true}
				displaySituation={true}
				avatar={false}
			/>
	</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto flex w-full max-w-7xl items-center justify-center p-4 py-8;
	}
	/* Hero Gradient */
	/* prettier-ignore */
	.hero-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 98% 1%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%);
	}
	/* SvelteKit Gradient */
	/* prettier-ignore */
	.team-gradient {
		background-image:
			radial-gradient(at 0% 100%, rgba(var(--color-secondary-500) / 0.50) 0px, transparent 50%);
	}
	/* Sponsors Gradient */
	/* prettier-ignore */
	.facility-gradient {
		background-image:
		radial-gradient(at 0% 99%, rgba(var(--color-secondary-500) / 0.23) 0px, transparent 50%),
		radial-gradient(at 100% 100%, rgba(var(--color-primary-500) / 0.19) 0px, transparent 50%);
	}

	/* Blog Gradient */
	/* prettier-ignore */
	.blog-gradient {
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
