<script lang="ts">
    import { page } from '$app/state';
    import { preloadData, goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import CreateInviteeModal from './CreateInviteeModal.svelte';
    import DeleteInvitee from '$routes/(common)/web/invite/delete/+page.svelte';
    import type { Invitee } from '#lib/interfaces/v2/invitee.ts';

    let { redirect=true }: { redirect?: boolean } = $props();

    export async function handleDelete(invitee: Invitee) {
        const href = resolve(`web/invite/delete`);
        const result = await preloadData(href);

        if (result.type === 'loaded' && result.status === 200) {
            goto(href, {
                shallow: true,
                state: { deleting: { ...result.data, invitee } }
            });
        } else {
            goto(href);
        }
    }
</script>

{#if page.state.deleting}
    <CreateInviteeModal
        onresult={() => history.back()}
        title={"Supprimer l'invitation"}
    ><DeleteInvitee data={page.state.deleting} redirect={redirect} /></CreateInviteeModal>
{/if}
