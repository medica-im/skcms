<script lang="ts">
    import { page } from "$app/state";
    import UserCard from "$lib/Dashboard/UserCard.svelte";
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
    import type { OauthSession } from "$lib/interfaces/oidc";
    const session = $derived(page.data.session);
</script>

<svelte:head>
	<title>
		{page.data.user.name} - {capitalizeFirstLetter(page.data.organization.formatted_name)}
	</title>
</svelte:head>

<div class="section-container">
{#if session?.user}
<div class="flex flex-wrap">
    <UserCard />
    </div>
{/if}
</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto flex w-full max-w-7xl items-center justify-center p-4 py-8;
	}
</style>