<script lang="ts">
	import EffectorContact from '../components/Directory/EffectorContact.svelte';
	import CareHomeOccupancy from './CareHome/CareHomeOccupancy.svelte';
	let { data } = $props();
</script>

<div class="flex flex-wrap justify-center gap-4 p-4">
	<EffectorContact data={{fullentry: data.fullentry, memberships: data.memberships}} />
	{#if data.careHomeData}
		<CareHomeOccupancy data={data.careHomeData} />
	{/if}
</div>
