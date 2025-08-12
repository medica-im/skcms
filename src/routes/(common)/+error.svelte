<script lang="ts">
	import { page } from '$app/state';
	import { emojis } from '$lib/Error/error';
	import Error404 from '$lib/404/Error404.svelte';
</script>

<section id="programs" class="bg-surface-100-800-token programs-gradient">
	<div class="section-container">
		{#if page.error}
			{#if page.status == 404}
				<Error404 />
			{:else}
				<div class="card variant-ghost">
					<h1>{page.status} {page.error.message}</h1>
					{emojis[page.status as keyof object] ?? emojis[500]}
				</div>
			{/if}
		{/if}
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
