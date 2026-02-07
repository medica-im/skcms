<script lang="ts">
    import { Invitee } from '$lib/Invitee';
    import EditInviteeModal from '$lib/Invitee/EditInviteeModal.svelte';
    import DeleteInviteeModal from '$lib/Invitee/DeleteInviteeModal.svelte';
    import * as m from '$msgs';
    import Fa from 'svelte-fa';
    import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    let invitee = $derived(data.invitee);
    let editModal: EditInviteeModal;
    let deleteModal!: DeleteInviteeModal;
</script>

<div class="container mx-auto p-4">
    <header class="mb-6">
        <a href="/web/invite/invitees" class="btn variant-ghost-primary mb-4">
            <span class="badge variant-filled-primary"><Fa icon={faArrowLeft} /></span>
            <span>{m.INVITEE_BACK_TO_LIST()}</span>
        </a>
        <h1 class="h1 mb-2">Invitation</h1>
    </header>

    <Invitee {invitee} showLink={false} onEdit={(inv) => editModal.handleEdit(inv)} onDelete={(inv) => deleteModal.handleDelete(inv)} />
</div>

<EditInviteeModal bind:this={editModal} />
<DeleteInviteeModal bind:this={deleteModal} redirect={true} />
