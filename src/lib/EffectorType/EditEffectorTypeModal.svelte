<script lang="ts">
    import { page } from '$app/state';
    import { preloadData, goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import EffectorTypeModal from './EffectorTypeModal.svelte';
    import UpdateEffectorType from '$routes/(common)/web/effector-types/update/+page.svelte';
    import type { EffectorType } from '#lib/interfaces/v2/effector.ts';
    import * as m from '$msgs';

    export async function handleEdit(effectorType: EffectorType) {
        const href = resolve('web/effector-types/update');
        const result = await preloadData(href);

        if (result.type === 'loaded' && result.status === 200) {
            await goto(href, {
                shallow: true,
                state: { editing: { ...result.data, effectorType } }
            });
        } else {
            await goto(href);
        }
    }
</script>

{#if page.state.editing}
    <EffectorTypeModal onresult={() => history.back()} title={m.EFFECTOR_TYPE_EDIT()} dialogClass="sm:max-w-4xl">
        <UpdateEffectorType data={page.state.editing} />
    </EffectorTypeModal>
{/if}
