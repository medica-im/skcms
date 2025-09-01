<script lang="ts">
    import * as m from '$msgs';
    import EditTPP from '$lib/Web/Entry/ThirdPartyPayer/Patch.svelte';
	import DeleteTPP from '$lib/Web/Entry/ThirdPartyPayer/Delete.svelte';
    import type { ThirdPartyPayer } from '$lib/interfaces/fullEffector.interface';

    let { data, editMode = false }: { data: ThirdPartyPayer[] | null; editMode?: boolean } = $props();

</script>

<div class="flex items-center p-1">
		<div class="w-9"></div>
		<div class="p-1">
			{m.ADDRESSBOOK_THIRD_PARTY_PAYER()}:
            
			{#each data as p, i}
				{@const count = data.length}
				{#if i > 0}{' '}{/if}{p.label_fr}{#if i < count - 2},{:else if i == count - 2}{' '}{m.AND()}{:else}.{/if}
			            {:else}
			∅
            {/each}
		</div>
		{#if editMode}
			<div class="flex p-2 space-x-4">
				<EditTPP {data} />
				{#if data != null}
				<DeleteTPP data={data} />
				{/if}
			</div>
		{/if}
	</div>