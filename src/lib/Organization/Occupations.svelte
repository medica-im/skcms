<script lang="ts">
	export let data: any;
</script>

<div class="space-x-2">
	{#each [...data] as [key, value]}
		<a
			href={`/annuaire/${value[0].effector_type.slug}?types=${encodeURIComponent(JSON.stringify([value[0].effector_type.uid]))}`}
			class="btn variant-ghost-primary btn-sm m-2"
			><span class="">
				{value.length}
				{key}
			</span></a
		>
	{/each}
</div>
