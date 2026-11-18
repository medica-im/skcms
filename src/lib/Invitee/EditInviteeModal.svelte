<script lang="ts">
    import { page } from '$app/state';
    import { preloadData, goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import CreateInviteeModal from './CreateInviteeModal.svelte';
    import UpdateInvitee from '$routes/(common)/web/invite/update/+page.svelte';
    import type { Invitee } from '#lib/interfaces/v2/invitee.ts';

    export async function handleEdit(invitee: Invitee) {
        const href = resolve(`web/invite/update`);
        const result = await preloadData(href);

        if (result.type === 'loaded' && result.status === 200) {
            goto(href, {
                shallow: true,
                state: { editing: { ...result.data, invitee } }
            });
        } else {
            goto(href);
        }
    }
</script>

{#if page.state.editing}
    <CreateInviteeModal onresult={() => history.back()} title={"Modifier l'invitation"}>
        <UpdateInvitee data={page.state.editing} />
    </CreateInviteeModal>
{/if}
