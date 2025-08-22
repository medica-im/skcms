<script lang="ts">
	import { getEditMode } from '$lib/components/Directory/context';
	import Phone from './Phone.svelte';
	let { data} = $props();

	const editMode = getEditMode();
</script>
<div class="">
{#each data as phone}
<Phone phoneData={phone} editMode={$editMode}/>
{/each}
</div>