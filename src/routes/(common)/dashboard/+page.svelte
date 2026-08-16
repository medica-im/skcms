<script lang="ts">
    import { page } from "$app/state";
    import UserCard from "$lib/Dashboard/UserCard.svelte";
    import { UserEntries } from "$lib/User";
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
    import type { OauthSession } from "$lib/interfaces/oidc";
    import Fa from 'svelte-fa';
    import { faBan } from '@fortawesome/free-solid-svg-icons';
    import * as m from '$msgs';
    const session = $derived(page.data.session);

    // Suspension withholds privileges without ending the identity: signing in
    // still works. Said plainly here because the alternative is a site that has
    // silently stopped working, with nothing on screen to explain why — and a
    // suspended user who is told nothing has no way to know who to ask.
    const suspended = $derived(Boolean(page.data.user?.suspended));
    const suspensionReason = $derived(page.data.user?.suspensionReason);
</script>

<svelte:head>
	<title>
		{page.data.user?.name||session?.user?.name} - {capitalizeFirstLetter(page.data.organization.formatted_name)}
	</title>
</svelte:head>

<div class="section-container">
{#if session?.user}
	<div class="flex flex-col gap-8 w-full">
		{#if suspended}
			<div class="alert variant-filled-warning" data-testid="suspended-banner">
				<span><Fa icon={faBan} size="lg" /></span>
				<div class="alert-message">
					<p>{m.ACCESS_SUSPENDED_BANNER()}</p>
					{#if suspensionReason}
						<p class="text-sm opacity-90">{suspensionReason}</p>
					{/if}
				</div>
			</div>
		{/if}
		<div class="flex flex-wrap">
			<UserCard />
		</div>
		{#if page.data.user?.uid}
			<UserEntries userUid={page.data.user.uid} />
		{/if}
	</div>
{/if}
</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto flex w-full max-w-7xl items-center justify-center p-4 py-8;
	}
</style>