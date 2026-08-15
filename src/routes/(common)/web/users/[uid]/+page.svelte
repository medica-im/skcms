<script lang="ts">
    import { page } from '$app/state';
    import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
    import { UserCard, UserEntries } from '$lib/User';
    import * as m from '$msgs';
    import Fa from 'svelte-fa';
    import { faArrowLeft, faKey, faShieldHalved, faClipboardList, faCircle } from '@fortawesome/free-solid-svg-icons';
    import type { PageData } from './$types';
    import RoleBadge from '$lib/RoleBadge.svelte';

    let { data }: { data: PageData } = $props();
    let userDetail = $derived(data.userDetail);

    const isAuthorized = $derived(
        page.data?.user?.role === 'superuser' || page.data?.user?.role === 'administrator'
    );

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
            <a href="/web/users" class="btn variant-ghost-primary mb-4">
                <span class="badge variant-filled-primary"><Fa icon={faArrowLeft} /></span>
                <span>Retour à la liste</span>
            </a>
            <h1 class="h1 mb-2">{m.user_noun({ count: 1 })}</h1>
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
                {#if userDetail.access.length > 0}
                    <div class="grid grid-cols-1 gap-2">
                        {#each userDetail.access as access (access.uid)}
                            <div class="card variant-ghost p-4">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <span class="text-sm text-surface-500">Rôle</span>
                                        <p>
                                            <RoleBadge role={access.role} full />
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
                                        <p class="flex items-center gap-1">
                                            <Fa
                                                icon={faCircle}
                                                size="sm"
                                                class={access.active ? 'text-success-500' : 'text-surface-400'}
                                            />
                                            {access.active ? 'Actif' : 'Inactif'}
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
