<script lang="ts">
	import { page } from '$app/state';
	import { organizationStore } from '$lib/store/facilityStore';
	import * as m from '$msgs';
	import OpenGraph from '$lib/components/OpenGraph/OpenGraph.svelte';
	import { language } from '$lib/store/languageStore';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { PageProps } from './$types';
	//import LDTag from '$lib/Schema/LDTag.svelte';
	import Directory from '$lib/components/Directory/CtxDirectory.svelte';
	let { data }: PageProps = $props();
   
	const log = (obj: Map<string,object>) => {
		let _str = "";
		_str+=(`${obj}:\n`);
		for (let [key, value] of obj) {
			_str+=(key + ' = ' + JSON.stringify(value)+ '\n');
		}
		return _str
	};
</script>

<!--LDTag schema={data.websiteSchema} /-->
<svelte:head>
	{#if data?.openGraph}
		<OpenGraph opengraph={data.openGraph} />
	{/if}

	<title>
		Annuaire - {capitalizeFirstLetter($organizationStore.formatted_name, $language)}
	</title>
</svelte:head>
<div>
	<!-- hero -->
	<header id="hero" class="bg-surface-100-800-token hero-gradient">
		<div class="section-container">
			<h2 class="h2">
				{m.ADDRESSBOOK_TITLE()}
			</h2>
		</div>
	</header>
	<div>
		{#key [page.url]}
			<Directory
				data={data?.cardinal}
				propCurrentOrg={true}
				displayCommune={true}
				displayGeocoder={true}
				displayCategory={true}
				displaySituation={true}
				avatar={true}
			/>
		{/key}
	</div>
</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-7xl p-4 py-8 md:py-10;
	}
	/* Hero Gradient */
	/* prettier-ignore */
	.hero-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 98% 1%, rgba(var(--color-error-500) / 0.33) 0px, transparent 50%);
	}
</style>
