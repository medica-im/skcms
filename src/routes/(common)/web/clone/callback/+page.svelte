<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { cloneToken } from '$lib/Web/Clone/token.svelte.ts';

	/**
	 * Where the source sends the superuser back, token in the fragment.
	 *
	 * The fragment is read here and never leaves this component: it goes into
	 * memory, and the navigation to the wizard replaces the entry so the token
	 * is not in the address bar, in history, or in `document.referrer`.
	 *
	 * `goto(..., { replaceState: true })` rather than `history.replaceState`:
	 * the raw History API conflicts with SvelteKit's router, which warns about
	 * it and then loses track of where it is — that is what left an authorised
	 * superuser bouncing back to step one of the wizard forever.
	 */
	$effect(() => {
		const hash = typeof location !== 'undefined' ? location.hash : '';
		if (hash.includes('token=')) {
			const params = new URLSearchParams(hash.replace(/^#/, ''));
			cloneToken.value = params.get('token');
			cloneToken.instance = params.get('instance');
			cloneToken.orgEntry = params.get('org');
		}
		// replaceState so Back does not return to a URL that once held a token.
		goto(`${base}/web/clone`, { replaceState: true, noScroll: true });
	});
</script>

<p class="p-8">Redirection…</p>
