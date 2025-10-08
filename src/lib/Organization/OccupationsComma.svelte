<script lang="ts">
	export let data;
</script>

{#each [...data] as [key, value], i}
	{value.length}
	{key}{#if i == data.size - 2}{' '}et{' '}{:else if i < data.size - 1},{' '}{/if}
{/each}
