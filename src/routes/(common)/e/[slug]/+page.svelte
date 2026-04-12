<script lang="ts">
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		if (page.url.searchParams.has('invalidateEntries')) {
			invalidate('app:entries');
			invalidate('app:facilities');
		}
	});
</script>

<svelte:head>
	<link rel="canonical" href={data?.canonicalUrl} />
</svelte:head>

<section id="programs" class="bg-surface-100-800-token programs-gradient">
	<div class="section-container place-items-center">
			<data.component data={data.componentData} />
	</div>
</section>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-7xl p-4 py-4 md:py-6;
	}
	/* Programs Gradient */
	/* prettier-ignore */
	.programs-gradient {
	background-image:
		radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
		radial-gradient(at 100% 0%,  rgba(var(--color-primary-500) / 0.33) 0px, transparent 50%);
}
</style>
