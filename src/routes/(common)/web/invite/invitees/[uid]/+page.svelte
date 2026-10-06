<script lang="ts">
    import { InviteeDetail } from '$lib/Invitee';
    import EditInviteeModal from '$lib/Invitee/EditInviteeModal.svelte';
    import DeleteInviteeModal from '$lib/Invitee/DeleteInviteeModal.svelte';
    import * as m from '$msgs';
    import Fa from 'svelte-fa';
    import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
    import type { PageData } from './$types';
    import { base } from '$app/paths';
    import { invalidateAll } from '$app/navigation';
    import { ORIGIN } from '$lib/utils/origin.ts';
    import { LiveDeliveries } from '$lib/Invitee/liveDeliveries.svelte';

    let { data }: { data: PageData } = $props();
    // Its email's status as the backend pushes it: after a correction, the
    // new address accepted, then delivered (or rejected), without reloading.
    // Reloaded once per (re)connection, so nothing published before is missed.
    const live = new LiveDeliveries();
    $effect(() => live.connect(`${ORIGIN}/api/v2/invitees/events`, invalidateAll));
    let invitee = $derived(live.apply(data.invitee ? [data.invitee] : undefined)?.[0] ?? data.invitee);
    let createdByUser = $derived(data.createdByUser);
    let editModal: EditInviteeModal;
    let deleteModal!: DeleteInviteeModal;
</script>

<div class="container mx-auto p-4">
    <header class="mb-6">
        <a href="{base}/web/invite/invitees" class="btn variant-ghost-primary mb-4">
            <span class="badge variant-filled-primary"><Fa icon={faArrowLeft} /></span>
            <span>{m.INVITEE_BACK_TO_LIST()}</span>
        </a>
        <h1 class="h1 mb-2">Invitation</h1>
    </header>

    {#if invitee}
        <InviteeDetail {invitee} {createdByUser} onEdit={(inv) => editModal.handleEdit(inv)} onDelete={(inv) => deleteModal.handleDelete(inv)} />
    {/if}
</div>

<EditInviteeModal bind:this={editModal} />
<DeleteInviteeModal bind:this={deleteModal} redirect={true} />
