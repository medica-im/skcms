<script lang="ts">
    import * as m from '$msgs';
    import EditConvention from '$lib/Web/Entry/Convention/Patch.svelte';
	import DeleteConvention from '$lib/Web/Entry/Convention/Delete.svelte';
    import type { Convention } from '$lib/interfaces/fullEffector.interface';

    let { data, editMode = false }: { data: Convention | null; editMode?: boolean } = $props();

</script>

<div class="flex items-center p-1">
		<div class="w-9"></div>
		<div class="p-1">
			Convention: {#if data}{data.label}.{:else}∅{/if}
		</div>
		{#if editMode}
			<div class="flex p-2 space-x-4">
				<EditConvention {data} />
				{#if data != null}
				<DeleteConvention {data} />
				{/if}
			</div>
		{/if}
	</div>