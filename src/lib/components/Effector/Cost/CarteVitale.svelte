<script lang="ts">
	import * as m from '$msgs';
	import EditCV from '$lib/Web/Entry/CarteVitale/Patch.svelte';
	import DeleteCV from '$lib/Web/Entry/CarteVitale/Delete.svelte';
    import type { CarteVitale } from '$lib/interfaces/fullEffector.interface';

	let { data, editMode = false }: { data: CarteVitale|null; editMode?: boolean } = $props();

	const displayCarteVitale = () => {
		if (data == true) {
			return m.YES() + '.';
		} else if (data == false) {
			return m.NO() + '.';
		} else {
			return '∅';
		}
	};
</script>

<div class="flex items-center p-1">
	<div class="w-9"></div>
	<div class="p-1">
		Carte Vitale: {displayCarteVitale()}
	</div>
	{#if editMode}
		<div class="flex p-2 space-x-4">
			<EditCV {data} />
			{#if data != null}
				<DeleteCV {data} />
			{/if}
		</div>
	{/if}
</div>
