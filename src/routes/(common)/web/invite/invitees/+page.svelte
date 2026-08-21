<script lang="ts">
	import { page } from '$app/state';
	import CreateInviteeModal from '$lib/Invitee/CreateInviteeModal.svelte';
	import CreateInvitee from '$routes/(common)/web/invite/create/+page.svelte';
	import EditInviteeModal from '$lib/Invitee/EditInviteeModal.svelte';
	import DeleteInviteeModal from '$lib/Invitee/DeleteInviteeModal.svelte';
	import { Invitee } from '$lib/Invitee';
	import { preloadData, pushState, goto } from '$app/navigation';
	import { faPlus, faFileLines } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import ExportModeToggle from '$lib/components/ExportModeToggle/ExportModeToggle.svelte';
	import * as m from '$msgs';
	import { normalize } from '$lib/helpers/stringHelpers.ts';
	import { ORIGIN } from '$lib/utils/origin.ts';
	import type { PageData } from './$types';
	import { base } from '$app/paths';

	let { data }: { data: PageData } = $props();
	let invitees = $derived(data.invitees);
	let searchTerm = $state('');
	let filteredInvitees = $derived.by(() => {
		if (!searchTerm.trim()) return invitees;
		const term = normalize(searchTerm);
		return invitees?.filter((inv) =>
			(inv.name && normalize(inv.name).includes(term)) ||
			normalize(inv.email).includes(term)
		);
	});
	let editModal: EditInviteeModal;
	let deleteModal: DeleteInviteeModal;
	let createOpen: boolean = $state(false);

	const isSuperuser = $derived(page.data?.user?.role === 'superuser');

	let exportMode = $state(false);
	let selectedUids = $state<Set<string>>(new Set());
	let exporting = $state(false);

	function updateSelectionForExportMode() {
		if (exportMode && filteredInvitees) {
			selectedUids = new Set(filteredInvitees.map((i) => i.uid));
		} else {
			selectedUids = new Set();
		}
	}

	function toggleAll() {
		if (!filteredInvitees) return;
		if (selectedUids.size === filteredInvitees.length) {
			selectedUids = new Set();
		} else {
			selectedUids = new Set(filteredInvitees.map((i) => i.uid));
		}
	}

	function toggleInvitee(uid: string) {
		const next = new Set(selectedUids);
		if (next.has(uid)) {
			next.delete(uid);
		} else {
			next.add(uid);
		}
		selectedUids = next;
	}

	async function exportCsv() {
		if (selectedUids.size === 0) return;
		exporting = true;
		try {
			const response = await fetch(`${ORIGIN}/api/v2/invitees/export/listmonk`, {
				credentials: 'include',
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ invitee_uids: [...selectedUids] })
			});
			if (!response.ok) {
				throw new Error(`Export failed: ${response.status}`);
			}
			const blob = await response.blob();
			const disposition = response.headers.get('Content-Disposition') ?? '';
			const match = disposition.match(/filename="?([^"]+)"?/);
			const filename = match?.[1] ?? 'listmonk_invitees.csv';
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error: any) {
			console.error('Export error:', error.message);
		} finally {
			exporting = false;
		}
	}

	let allSelected = $derived(
		filteredInvitees != null && filteredInvitees.length > 0 && selectedUids.size === filteredInvitees.length
	);
</script>

<div class="container mx-auto p-4">
	<header class="mb-6 space-y-4">
		<div class="flex justify-between items-center">
			<div>
				<h1 class="h1 mb-2">{m.INVITEE_PAGE_TITLE()}</h1>
				<p class="text-surface-600">
					{filteredInvitees?.length ?? 0} {m.invitee_noun({ count: filteredInvitees?.length ?? 0 })}
				</p>
			</div>
			<div class="flex gap-2">
				<a href="{base}/web/invite/batch">
					<button class="btn variant-filled-secondary" title={m.BATCH_INVITEE_BUTTON_TITLE()}>
						<span><Fa icon={faFileLines} /></span>
						<span class="hidden lg:block">{m.BATCH_INVITEE_BUTTON()}</span>
					</button>
				</a>
				<a
					href="{base}/web/invite/create"
					onclick={async (e) => {
						if (e.shiftKey || e.metaKey || e.ctrlKey) return;

						e.preventDefault();
						const { href } = e.currentTarget;
						const result = await preloadData(href);

						if (result.type === 'loaded' && result.status === 200) {
							createOpen = true;
							pushState(href, { selected: result.data });
						} else {
							goto(href);
						}
					}}
				>
					<button class="btn variant-filled-primary" title={m.INVITEE_CREATE_BUTTON()}>
						<span><Fa icon={faPlus} /></span>
						<span class="hidden lg:block">{m.INVITEE_CREATE_BUTTON()}</span>
					</button>
				</a>
			</div>
		</div>
		{#if isSuperuser}
			<div class="flex justify-end">
				<ExportModeToggle bind:checked={exportMode} onchange={updateSelectionForExportMode} />
			</div>
		{/if}
	</header>

	<!-- Search -->
	<div class="mb-4 max-w-sm">
		<input
			type="search"
			class="input"
			placeholder="{m.INVITEE_COL_NAME()} / {m.INVITEE_COL_EMAIL()}..."
			bind:value={searchTerm}
		/>
	</div>

	{#if exportMode}
		<div class="mb-4 flex items-center gap-4">
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					class="checkbox"
					checked={allSelected}
					onchange={toggleAll}
				/>
				<span class="text-sm font-semibold">
					{allSelected ? m.USERS_DESELECT_ALL() : m.USERS_SELECT_ALL()}
				</span>
			</label>
			<span class="text-sm text-surface-500">
				{m.USERS_SELECTED_COUNT({ selected: selectedUids.size, total: filteredInvitees?.length ?? 0 })}
			</span>
			<button
				class="btn variant-filled-primary ml-auto"
				disabled={selectedUids.size === 0 || exporting}
				onclick={exportCsv}
			>
				{exporting ? m.USERS_EXPORTING() : m.INVITEE_EXPORT_SELECTION({ count: selectedUids.size })}
			</button>
		</div>
	{/if}

	<!-- Column Headers (large screens only) -->
	<div class="hidden lg:grid lg:items-center lg:gap-4 px-3 pb-2 text-sm font-semibold text-surface-500"
		class:lg:grid-cols-[40px_40px_1fr_1.5fr_120px_130px_130px_80px_36px_36px_36px]={exportMode}
		class:lg:grid-cols-[40px_1fr_1.5fr_120px_130px_130px_80px_36px_36px_36px]={!exportMode}
	>
		{#if exportMode}<span></span>{/if}
		<span></span>
		<span>{m.INVITEE_COL_NAME()}</span>
		<span>{m.INVITEE_COL_EMAIL()}</span>
		<span>{m.INVITEE_COL_ROLE()}</span>
		<span>{m.INVITEE_COL_CREATED()}</span>
		<span>{m.INVITEE_COL_REDEEMED()}</span>
		<span>{m.INVITEE_COL_STATUS()}</span>
		<span class="col-span-3 text-center">{m.INVITEE_COL_ACTIONS()}</span>
	</div>

	<div class="grid grid-cols-1 gap-2">
		{#each filteredInvitees as invitee (invitee.uid)}
			{#if exportMode}
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						class="checkbox flex-shrink-0"
						checked={selectedUids.has(invitee.uid)}
						onchange={() => toggleInvitee(invitee.uid)}
					/>
					<div class="flex-1">
						<Invitee {invitee} highlighted={(Date.now() - new Date(invitee.createdAt).getTime()) < 60_000} onEdit={(inv) => editModal.handleEdit(inv)} onDelete={(inv) => deleteModal.handleDelete(inv)} />
					</div>
				</div>
			{:else}
				<Invitee {invitee} highlighted={(Date.now() - new Date(invitee.createdAt).getTime()) < 60_000} onEdit={(inv) => editModal.handleEdit(inv)} onDelete={(inv) => deleteModal.handleDelete(inv)} />
			{/if}
		{/each}
	</div>
</div>

{#if createOpen}
	<CreateInviteeModal onresult={() => {}} title={"Créer une invitation"}>
		<CreateInvitee data={page.state.selected ?? data} onclose={() => {
			createOpen = false;
			history.back();
		}} />
	</CreateInviteeModal>
{/if}

<EditInviteeModal bind:this={editModal} />
<DeleteInviteeModal bind:this={deleteModal} />
