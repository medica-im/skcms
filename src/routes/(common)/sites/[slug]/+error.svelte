<script lang="ts">
	import { page } from '$app/state';
	import Error from '$lib/Error/Error.svelte';
	import type { SveltekitError } from '$lib/interfaces/error.interface';
</script>

{#if page.error}
	<Error data={page.error as SveltekitError} />
{/if}
