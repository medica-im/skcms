<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getTerm } from '$lib/components/Directory/context';
	import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import DocsIcon from '$lib/Icon/Icon.svelte';
	import * as m from "$msgs";

	const term = getTerm();

	const termFromUrl: string = $derived(page.url.searchParams.get('term') || '');

	$effect(() => {
		term.set(termFromUrl);
	});
</script>

<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
	<div class="input-group-shim"><Fa icon={faMagnifyingGlass} /></div>
	<input
		type="search"
		autocomplete="off"
		placeholder={m.ADDRESSBOOK_SEARCH_PLACEHOLDER()}
		bind:value={$term}
		onblur={() => {
			const url = new URL(page.url);
			if ($term) {
				url.searchParams.set('term', $term);
			} else {
				url.searchParams.delete('term');
			}
			const newUrl = url.searchParams.toString() ? `${url.pathname}?${url.searchParams}` : url.pathname;
			goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
		}}
		aria-label={m.ADDRESSBOOK_SEARCH_ARIA_LABEL()}
	/>
	<button
		class="variant-filled-secondary"
		onclick={() => {
			const url = new URL(page.url);
			url.searchParams.delete('term');
			const newUrl = url.searchParams.toString() ? `${url.pathname}?${url.searchParams}` : url.pathname;
			goto(newUrl, { noScroll: true, keepFocus: true });
		}}
		aria-label={m.ADDRESSBOOK_CLEAR()}
		disabled={!$term}
	>
		<DocsIcon name="clear" width="w-5" height="h-5" />
	</button>
</div>

<style lang="postcss">
	/* clears the ‘X’ from Internet Explorer */
	input[type='search']::-ms-clear {
		display: none;
		width: 0;
		height: 0;
	}
	input[type='search']::-ms-reveal {
		display: none;
		width: 0;
		height: 0;
	}
	/* clears the ‘X’ from Chrome */
	input[type='search']::-webkit-search-decoration,
	input[type='search']::-webkit-search-cancel-button,
	input[type='search']::-webkit-search-results-button,
	input[type='search']::-webkit-search-results-decoration {
		display: none;
	}
</style>
