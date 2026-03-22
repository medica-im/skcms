<script lang="ts">
    import { page } from '$app/state';
    import { preloadData, pushState, goto } from '$app/navigation';
    import EffectorTypeModal from './EffectorTypeModal.svelte';
    import DeleteEffectorType from '$routes/(common)/web/effector-types/delete/+page.svelte';
    import type { EffectorType } from '$lib/interfaces/v2/effector';
    import * as m from '$msgs';

    export async function handleDelete(effectorType: EffectorType) {
        const href = '/web/effector-types/delete';
        const result = await preloadData(href);

        if (result.type === 'loaded' && result.status === 200) {
            pushState(href, { deleting: { ...result.data, effectorType } });
        } else {
            goto(href);
        }
    }
</script>

{#if page.state.deleting}
    <EffectorTypeModal onresult={() => history.back()} title={m.EFFECTOR_TYPE_DELETE()}>
        <DeleteEffectorType data={page.state.deleting} />
    </EffectorTypeModal>
{/if}
