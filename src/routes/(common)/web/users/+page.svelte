<script lang="ts">
    import { page } from '$app/state';
    import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
    import { UserCard } from '$lib/User';
    import * as m from '$msgs';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    let users = $derived(data.users);

    const isAuthorized = $derived(
        page.data?.user?.role === 'superuser' || page.data?.user?.role === 'administrator'
    );
</script>

<svelte:head>
    <title>{m.user_noun({ count: 2 })} - {capitalizeFirstLetter(page.data.organization?.formatted_name ?? '')}</title>
</svelte:head>

{#if isAuthorized}
    <div class="container mx-auto p-4">
        <header class="mb-6">
            <h1 class="h1 mb-2">{m.user_noun({ count: 2 })}</h1>
            <p class="text-surface-600">
                {users?.length ?? 0} {m.user_noun({ count: users?.length ?? 0 })}
            </p>
        </header>

        <!-- Column Headers (large screens only) -->
        <div class="hidden lg:grid lg:grid-cols-[40px_1fr_1.5fr_150px_120px_36px] lg:items-center lg:justify-items-start lg:gap-4 px-3 pb-2 text-sm font-semibold text-surface-500">
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
                    <UserCard {user} />
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
