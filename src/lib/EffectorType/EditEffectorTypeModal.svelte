<script lang="ts">
    import { page } from '$app/state';
    import { preloadData, pushState, goto } from '$app/navigation';
    import EffectorTypeModal from './EffectorTypeModal.svelte';
    import UpdateEffectorType from '$routes/(common)/web/effector-types/update/+page.svelte';
    import type { EffectorType } from '$lib/interfaces/v2/effector';
    import * as m from '$msgs';

    export async function handleEdit(effectorType: EffectorType) {
        const href = '/web/effector-types/update';
        const result = await preloadData(href);

        if (result.type === 'loaded' && result.status === 200) {
            pushState(href, { editing: { ...result.data, effectorType } });
        } else {
            goto(href);
        }
    }
</script>

{#if page.state.editing}
    <EffectorTypeModal onresult={() => history.back()} title={m.EFFECTOR_TYPE_EDIT()}>
        <UpdateEffectorType data={page.state.editing} />
    </EffectorTypeModal>
{/if}
