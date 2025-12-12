<script lang="ts">
	import * as m from '$msgs';
	import { getLocale } from '../../paraglide/runtime.js';
	import { page } from '$app/state';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { SveltekitError } from '$lib/interfaces/error.interface.ts';

	let { data }: { data: SveltekitError } = $props();
	console.log(getLocale());
	const addressbookUrl = () => {
		if ( page.data.organization.category.name === "cpts") {
			return '/'
		} else {
			return '/annuaire'
		}
	};
</script>

<svelte:head>
	<title>
		{m.ERROR()}
		{data.code} - {capitalizeFirstLetter(page.data.organization.formatted_name, getLocale())}
	</title>
</svelte:head>

<header>
	<div class="section-container place-items-center">
		<h1 class="h1">{m.ERROR()} {data.code}</h1>
	</div>
</header>

<div class="section-container place-items-center space-y-4 w-sm">
	<p>{data.message}</p>
	{#if data.type === 'entry'}
		{#if data.code === 404}
			<p>
				L'entrée que vous recherchez n'existe pas. L'addresse <code>{page.url.pathname}</code> ne correspond
				à aucune entrée. Peut-être a-t-elle été supprimée?
			</p>
			<div>
			<a href={addressbookUrl()} title={m.ADDRESSBOOK_TITLE()} class="btn variant-ghost-primary">{m.ADDRESSBOOK_TITLE()}</a>
			</div>
		{/if}
	{:else if data.type === 'site'}
			<p>
				Le site que vous recherchez n'existe pas. L'addresse <code>{page.url.pathname}</code> ne correspond
				à aucun site. Peut-être a-t-il été supprimé?
			</p>
			<div>
			<a href="/" title="Sites" class="btn variant-ghost-primary">Sites</a>
			</div>
	{/if}
	<div>
		<a href="/contact" title="Contact" class="btn variant-ghost-primary">Contact</a>
	</div>
</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-md p-4 py-4 md:py-6;
	}
</style>
