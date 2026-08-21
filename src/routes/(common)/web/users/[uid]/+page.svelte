<script lang="ts">
    import { page } from '$app/state';
    import { invalidateAll } from '$app/navigation';
    import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
    import { UserCard, UserEntries } from '$lib/User';
    import * as m from '$msgs';
    import Fa from 'svelte-fa';
    import { faArrowLeft, faKey, faShieldHalved, faClipboardList, faCircle, faPenToSquare, faBan } from '@fortawesome/free-solid-svg-icons';
    import type { PageData } from './$types';
    import RoleBadge from '$lib/RoleBadge.svelte';
    import Switch from '$lib/Switch/Switch.svelte';
    import { setEditMode, getEditMode } from '$lib/components/Directory/context';
    import RoleChangeModal from '$lib/User/RoleChangeModal.svelte';
    import SuspensionModal from '$lib/User/SuspensionModal.svelte';
    import AccessHistory from '$lib/User/AccessHistory.svelte';
    import { base } from '$app/paths';

    let { data }: { data: PageData } = $props();
    let userDetail = $derived(data.userDetail);

    // The same store the entry and facility pages use, so the pencil behaves
    // identically here: the role control lives inside edit mode rather than
    // beside it, because a page that shows it at all times invites a misclick
    // on the one thing that should never be a misclick.
    setEditMode();
    const editMode = getEditMode();

    const isAuthorized = $derived(
        page.data?.user?.role === 'superuser' || page.data?.user?.role === 'administrator'
    );

    // The access that decides what is shown: a user has one active access per
    // site, and it is the one the controls act on.
    const activeAccess = $derived(userDetail?.access?.find((a) => a.active));
    const currentRole = $derived(activeAccess?.role ?? 'registered');
    const suspended = $derived(Boolean(activeAccess?.suspendedAt));

    function formatDateTime(timestamp: number | null): string {
        if (!timestamp) return '—';
        const date = new Date(timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const time = date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        return `${day}/${month}/${year} ${time}`;
    }
</script>

<svelte:head>
    <title>{m.user_noun({ count: 1 })} - {capitalizeFirstLetter(page.data.organization?.formatted_name ?? '')}</title>
</svelte:head>

{#if isAuthorized}
    <div class="container mx-auto p-4">
        <header class="mb-6">
            <a href="{base}/web/users" class="btn variant-ghost-primary mb-4">
                <span class="badge variant-filled-primary"><Fa icon={faArrowLeft} /></span>
                <span>Retour à la liste</span>
            </a>
            <div class="mb-2 flex items-center justify-between gap-4">
                <h1 class="h1">{m.user_noun({ count: 1 })}</h1>
                <Switch icon={faPenToSquare} />
            </div>
        </header>

        {#if userDetail}
            <!-- User summary card -->
            <UserCard user={userDetail} showLink={false} />

            <!-- Accounts section -->
            <section class="mt-8">
                <h2 class="h3 mb-4 flex items-center gap-2">
                    <Fa icon={faKey} class="text-primary-500" />
                    Comptes
                </h2>
                {#if userDetail.accounts.length > 0}
                    <div class="grid grid-cols-1 gap-2">
                        {#each userDetail.accounts as account (account.uid)}
                            <div class="card variant-ghost p-4">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <span class="text-sm text-surface-500">Fournisseur</span>
                                        <p class="font-semibold">{account.iss || '—'}</p>
                                    </div>
                                    <div>
                                        <span class="text-sm text-surface-500">Identifiant</span>
                                        <p class="font-mono text-sm truncate">{account.sub}</p>
                                    </div>
                                    <div>
                                        <span class="text-sm text-surface-500">Créé le</span>
                                        <p>{formatDateTime(account.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-surface-500">Aucun compte associé.</p>
                {/if}
            </section>

            <!-- Access section -->
            <section class="mt-8">
                <h2 class="h3 mb-4 flex items-center gap-2">
                    <Fa icon={faShieldHalved} class="text-primary-500" />
                    Accès
                </h2>

                {#if suspended}
                    <!-- Stated on the record itself, not only in the history: a
                         suspended account keeps its role, so the role badge
                         alone would read as an ordinary administrator. -->
                    <div class="alert variant-ghost-warning mb-3" data-testid="suspended-notice">
                        <span><Fa icon={faBan} /></span>
                        <span>
                            {m.ACCESS_SUSPENDED_BADGE()}{activeAccess?.suspensionReason
                                ? ` — ${activeAccess.suspensionReason}`
                                : ''}
                        </span>
                    </div>
                {/if}

                {#if userDetail.access.length > 0}
                    <div class="grid grid-cols-1 gap-2">
                        {#each userDetail.access as access (access.uid)}
                            <div class="card variant-ghost p-4">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <span class="text-sm text-surface-500">Rôle</span>
                                        <!-- The pencil sits beside the value it
                                             changes, and only in edit mode: a
                                             role-change control on screen at all
                                             times invites a misclick on the one
                                             thing that should never be one. -->
                                        <p class="flex items-center gap-2">
                                            <RoleBadge role={access.role} full />
                                            {#if $editMode && access.active}
                                                <RoleChangeModal
                                                    userUid={userDetail.uid}
                                                    {currentRole}
                                                    {suspended}
                                                    onchanged={() => invalidateAll()}
                                                />
                                            {/if}
                                        </p>
                                    </div>
                                    <div>
                                        <span class="text-sm text-surface-500">Statut</span>
                                        <!-- Colour on the dot, not the words. Green text on the
                                             card background is close to unreadable — success-500
                                             is a mid-green chosen to sit under white badge text,
                                             not to be read as text itself. The icon carries the
                                             signal and the label stays at the default contrast.
                                             Same pattern as the invitee status. -->
                                        <p class="flex items-center gap-2">
                                            <span class="flex items-center gap-1">
                                                <!-- A suspended access is still
                                                     active, so the dot must not
                                                     say "Actif" on its own —
                                                     that is the state the whole
                                                     suspension exists to make
                                                     visible. -->
                                                <Fa
                                                    icon={faCircle}
                                                    size="sm"
                                                    class={access.active && !access.suspendedAt
                                                        ? 'text-success-500'
                                                        : access.suspendedAt
                                                          ? 'text-warning-500'
                                                          : 'text-surface-400'}
                                                />
                                                {access.suspendedAt
                                                    ? m.ACCESS_SUSPENDED_BADGE()
                                                    : access.active
                                                      ? 'Actif'
                                                      : 'Inactif'}
                                            </span>
                                            {#if $editMode && access.active}
                                                <SuspensionModal
                                                    userUid={userDetail.uid}
                                                    {suspended}
                                                    suspensionReason={access.suspensionReason}
                                                    onchanged={() => invalidateAll()}
                                                />
                                            {/if}
                                        </p>
                                    </div>
                                    <div>
                                        <span class="text-sm text-surface-500">Créé le</span>
                                        <p>{formatDateTime(access.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-surface-500">Aucun accès enregistré.</p>
                {/if}
            </section>

            <!-- Entries section -->
            <section class="mt-8">
                <h2 class="h3 mb-4 flex items-center gap-2">
                    <Fa icon={faClipboardList} class="text-primary-500" />
                    {capitalizeFirstLetter(m.ENTRIES({ count: 2 }))}
                </h2>
                <UserEntries userUid={userDetail.uid} />
            </section>

            <AccessHistory rows={data.accessHistory} />
        {:else}
            <div class="alert variant-filled-warning">
                <p>Utilisateur introuvable.</p>
            </div>
        {/if}
    </div>
{:else}
    <div class="container mx-auto p-4">
        <div class="alert variant-filled-error">
            <p>Accès restreint aux super-utilisateurs et administrateurs.</p>
        </div>
    </div>
{/if}
