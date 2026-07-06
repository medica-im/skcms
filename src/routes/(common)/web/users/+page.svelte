<script lang="ts">
    import { page } from '$app/state';
    import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
    import { UserCard } from '$lib/User';
    import { ORIGIN } from '$lib/utils/origin.ts';
    import * as m from '$msgs';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    let users = $derived(data.users);

    const isSuperuser = $derived(page.data?.user?.role === 'superuser');
    const isAuthorized = $derived(
        isSuperuser || page.data?.user?.role === 'administrator'
    );

    let exportMode = $state(false);
    let selectedUids = $state<Set<string>>(new Set());
    let exporting = $state(false);

    function toggleExportMode() {
        exportMode = !exportMode;
        if (exportMode && users) {
            selectedUids = new Set(users.map((u) => u.uid));
        } else {
            selectedUids = new Set();
        }
    }

    function toggleAll() {
        if (!users) return;
        if (selectedUids.size === users.length) {
            selectedUids = new Set();
        } else {
            selectedUids = new Set(users.map((u) => u.uid));
        }
    }

    function toggleUser(uid: string) {
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
            const response = await fetch(`${ORIGIN}/api/v2/users/export/listmonk`, {
                credentials: 'include',
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ user_uids: [...selectedUids] })
            });
            if (!response.ok) {
                throw new Error(`Export failed: ${response.status}`);
            }
            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition') ?? '';
            const match = disposition.match(/filename="?([^"]+)"?/);
            const filename = match?.[1] ?? 'listmonk_subscribers.csv';
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
        users != null && users.length > 0 && selectedUids.size === users.length
    );
</script>

<svelte:head>
    <title>{m.user_noun({ count: 2 })} - {capitalizeFirstLetter(page.data.organization?.formatted_name ?? '')}</title>
</svelte:head>

{#if isAuthorized}
    <div class="container mx-auto p-4">
        <header class="mb-6 flex items-center justify-between">
            <div>
                <h1 class="h1 mb-2">{m.user_noun({ count: 2 })}</h1>
                <p class="text-surface-600">
                    {users?.length ?? 0} {m.user_noun({ count: users?.length ?? 0 })}
                </p>
            </div>
            {#if isSuperuser}
                <button
                    class="btn {exportMode ? 'variant-filled-warning' : 'variant-filled-primary'}"
                    onclick={toggleExportMode}
                >
                    {exportMode ? m['cancel']?.() ?? 'Cancel' : 'Export Listmonk'}
                </button>
            {/if}
        </header>

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
                        {allSelected ? 'Deselect all' : 'Select all'}
                    </span>
                </label>
                <span class="text-sm text-surface-500">
                    {selectedUids.size} / {users?.length ?? 0} selected
                </span>
                <button
                    class="btn variant-filled-primary ml-auto"
                    disabled={selectedUids.size === 0 || exporting}
                    onclick={exportCsv}
                >
                    {exporting ? 'Exporting…' : `Export ${selectedUids.size} user${selectedUids.size !== 1 ? 's' : ''}`}
                </button>
            </div>
        {/if}

        <!-- Column Headers (large screens only) -->
        <div class="hidden lg:grid lg:items-center lg:justify-items-start lg:gap-4 px-3 pb-2 text-sm font-semibold text-surface-500"
            class:lg:grid-cols-[40px_40px_1fr_1.5fr_150px_120px_36px]={exportMode}
            class:lg:grid-cols-[40px_1fr_1.5fr_150px_120px_36px]={!exportMode}
        >
            {#if exportMode}<span></span>{/if}
            <span></span>
            <span>{m['INVITEE_COL_NAME']()}</span>
            <span>{m['INVITEE_COL_EMAIL']()}</span>
            <span>{m['INVITEE_COL_ROLE']()}</span>
            <span>{m['INVITEE_COL_CREATED']()}</span>
            <span></span>
        </div>

        <div class="grid grid-cols-1 gap-2">
            {#if users}
                {#each users as user (user.uid)}
                    {#if exportMode}
                        <div class="flex items-center gap-2">
                            <input
                                type="checkbox"
                                class="checkbox flex-shrink-0"
                                checked={selectedUids.has(user.uid)}
                                onchange={() => toggleUser(user.uid)}
                            />
                            <div class="flex-1">
                                <UserCard {user} />
                            </div>
                        </div>
                    {:else}
                        <UserCard {user} />
                    {/if}
                {/each}
            {/if}
        </div>
    </div>
{:else}
    <div class="container mx-auto p-4">
        <div class="alert variant-filled-error">
            <p>Accès restreint aux super-utilisateurs et administrateurs.</p>
        </div>
    </div>
{/if}
