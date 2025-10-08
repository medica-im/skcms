<script lang="ts">
	import { getEditMode } from '$lib/components/Directory/context.ts';
	import Phone from './Phone.svelte';
	export let data: any;
</script>
<div class="">
{#each data as phone}
<Phone data={phone} />
{/each}
</div>