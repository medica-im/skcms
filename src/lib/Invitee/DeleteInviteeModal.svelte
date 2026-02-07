<script lang="ts">
    import { page } from '$app/state';
    import { preloadData, pushState, goto } from '$app/navigation';
    import CreateInviteeModal from './CreateInviteeModal.svelte';
    import DeleteInvitee from '$routes/(common)/web/invite/delete/+page.svelte';
    import type { Invitee } from '$lib/interfaces/v2/invitee';

    let { redirect=false }: { redirect?: boolean } = $props();

    export async function handleDelete(invitee: Invitee) {
        const href = '/web/invite/delete';
        const result = await preloadData(href);

        if (result.type === 'loaded' && result.status === 200) {
            pushState(href, { deleting: { ...result.data, invitee } });
        } else {
            goto(href);
        }
    }
</script>

{#if page.state.deleting}
    <CreateInviteeModal onresult={() => history.back()} title={"Supprimer l'invitation"}>
        <DeleteInvitee data={page.state.deleting} {redirect} />
    </CreateInviteeModal>
{/if}
