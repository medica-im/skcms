<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faArrowLeft, faHouse, faLock } from '@fortawesome/free-solid-svg-icons';

	const isForbidden = $derived(page.status === 403 && page.error?.type === 'invitees-forbidden');

	// "Back" only makes sense when the user reached this page from the site itself.
	// document.referrer is empty on a direct hit (deep link, new tab, bookmark).
	let canGoBack = $state(false);
	$effect(() => {
		try {
			canGoBack =
				document.referrer !== '' && new URL(document.referrer).origin === location.origin;
		} catch {
			canGoBack = false;
		}
	});
</script>

<svelte:head>
	<title>
		{isForbidden ? m.INVITEES_FORBIDDEN_TITLE() : `${m.ERROR()} ${page.status}`} - {capitalizeFirstLetter(
			page.data.organization?.formatted_name ?? ''
		)}
	</title>
</svelte:head>

<div class="section-container space-y-4">
	{#if isForbidden}
		<header class="flex items-center gap-3">
			<Fa icon={faLock} size="lg" />
			<h1 class="h2">{m.INVITEES_FORBIDDEN_TITLE()}</h1>
		</header>
		<p>{m.INVITEES_FORBIDDEN_TEXT()}</p>
		<p class="text-surface-600-300-token">{m.INVITEES_FORBIDDEN_CONTACT()}</p>
	{:else}
		<header>
			<h1 class="h2">{m.ERROR()} {page.status}</h1>
		</header>
		{#if page.error}
			<p>{page.error.message}</p>
		{/if}
	{/if}

	<div class="flex flex-wrap gap-2 pt-2">
		{#if canGoBack}
			<button type="button" class="btn variant-filled-secondary" onclick={() => history.back()}>
				<span><Fa icon={faArrowLeft} /></span>
				<span>{m.GO_BACK()}</span>
			</button>
		{/if}
		<a href="{base}/" class="btn variant-filled-primary" title={m.HOME_TITLE()}>
			<span><Fa icon={faHouse} /></span>
			<span>{m.HOME_TITLE()}</span>
		</a>
	</div>
</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-xl p-4 py-4 md:py-8;
	}
</style>
