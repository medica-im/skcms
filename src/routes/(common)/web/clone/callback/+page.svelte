<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { takeTokenFromHash } from '$lib/Web/Clone/token.svelte.ts';

	/**
	 * Where the source sends the superuser back, token in the fragment.
	 *
	 * Takes it into memory, scrubs the address bar, and moves on — the token is
	 * never written to storage and never appears in a URL a server can see.
	 */
	$effect(() => {
		takeTokenFromHash();
		goto(`${base}/web/clone`, { replaceState: true });
	});
</script>

<p class="p-8">Redirection…</p>
