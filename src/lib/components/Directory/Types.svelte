<script lang="ts">
	import Buttons from './Buttons.svelte';

	export let data: any;
	export let displayEntries: boolean;
</script>

{#if data && [...data]?.length}
	<Buttons {data} {displayEntries} />
{/if}
