<script lang="ts">
	import * as m from '$msgs';
	import { page } from '$app/state';
</script>

{#if page.error}
	<header>
		<div class="section-container place-items-center">
			<h1 class="h1">{m.ERROR()} {page.error.code}</h1>
		</div>
	</header>

	<div class="section-container place-items-center space-y-4 w-sm">
		<p>{page.error.message}</p>
		{#if page.error.code === 404}
			<p>L'entrée que vous recherchez n'existe pas. L'addresse <code>{page.url.pathname}</code> ne correspond à aucune entrée. Peut-être a-t-elle été supprimée?</p>
		{/if}
		<div class="flex gap-4">
				<a href="/" title={m.ADDRESSBOOK_TITLE()} class="btn variant-ghost-primary">Annuaire</a>
				<a href="/contact" title="Contact" class="btn variant-ghost-primary">Contact</a>
			</div>
	</div>
{/if}

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-md p-4 py-4 md:py-6;
	}
</style>
