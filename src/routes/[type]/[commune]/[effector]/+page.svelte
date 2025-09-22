<script lang="ts">
	import EffectorContact from '$lib/components/Directory/EffectorContact.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	console.log(`form on page: ${JSON.stringify(data?.form)}`);
</script>

<svelte:head>
	<link rel="canonical" href={data.canonicalUrl} />
</svelte:head>

<section id="programs" class="bg-surface-100-800-token programs-gradient">
	<div class="section-container">
		<EffectorContact {data} />
	</div>
</section>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-7xl p-4 py-8 md:py-12;
	}
	/* Programs Gradient */
	/* prettier-ignore */
	.programs-gradient {
	background-image:
		radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
		radial-gradient(at 100% 0%,  rgba(var(--color-primary-500) / 0.33) 0px, transparent 50%);
}
</style>
