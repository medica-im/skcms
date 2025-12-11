<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { language } from '$lib/store/languageStore';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { PageProps } from './$types';
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
	<title>
		Entrées - {capitalizeFirstLetter(page.data.organization.formatted_name, $language)}
	</title>
</svelte:head>
<div>
	<!-- hero -->
	<header id="hero" class="bg-surface-100-800-token hero-gradient">
		<div class="section-container">
			<h2 class="h2">
				{capitalizeFirstLetter(m.ENTRIES( {count: 2} ))}
			</h2>
		</div>
	</header>
	<div>
			<Directory
				data={data?.cardinal}
				propCurrentOrg={null}
				displayCommune={true}
				displayGeocoder={false}
				displayCategory={true}
				displaySituation={false}
				avatar={false}
				setRedirect={false}
			/>
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
