<script lang="ts">
    import { page } from '$app/state';
    import CreateInviteeModal from '$lib/Invitee/CreateInviteeModal.svelte';
	import CreateInvitee from '$routes/(common)/web/invite/create/+page.svelte';
	import EditInviteeModal from '$lib/Invitee/EditInviteeModal.svelte';
	import DeleteInviteeModal from '$lib/Invitee/DeleteInviteeModal.svelte';
    import { Invitee } from '$lib/Invitee';
	import { preloadData, pushState, goto } from '$app/navigation';
	import { faPlus } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let invitees = $derived(data.invitees);
	let createInviteeModal: CreateInviteeModal|undefined = $state();
	let editModal: EditInviteeModal;
	let deleteModal: DeleteInviteeModal;
	let createInviteeCounter = $state(0);
</script>

<div class="container mx-auto p-4">
	<header class="mb-6 flex justify-between items-center">
		<div>
			<h1 class="h1 mb-2">Invitations</h1>
			<p class="text-surface-600">
				{invitees.length} invitation{invitees.length > 1 ? 's' : ''}
			</p>
		</div>
		<a
			href="/web/invite/create"
			onclick={async (e) => {
				createInviteeCounter+=1;
				console.log('Create invitee counter:', createInviteeCounter);
				if (e.shiftKey || e.metaKey || e.ctrlKey) return;

				e.preventDefault();
				const { href } = e.currentTarget;
				const result = await preloadData(href);

				if (result.type === 'loaded' && result.status === 200) {
					pushState(href, { selected: result.data });
				} else {
					goto(href);
				}
			}}
		>
			<button class="btn variant-filled-primary" title="Créer une invitation">
				<span><Fa icon={faPlus} /></span>
				<span class="hidden lg:block">Créer une invitation</span>
			</button>
		</a>
	</header>

	<div class="grid grid-cols-1 gap-2">
		{#each invitees as invitee (invitee.uid)}
			<Invitee {invitee} onEdit={(inv) => editModal.handleEdit(inv)} onDelete={(inv) => deleteModal.handleDelete(inv)} />
		{/each}
	</div>
</div>

{#if page.state.selected}
	<CreateInviteeModal bind:this={createInviteeModal} onresult={() => history.back()} title={"Créer une invitation"}>
		<CreateInvitee data={page.state.selected} counter={createInviteeCounter} />
	</CreateInviteeModal>
{/if}

<EditInviteeModal bind:this={editModal} />
<DeleteInviteeModal bind:this={deleteModal} />