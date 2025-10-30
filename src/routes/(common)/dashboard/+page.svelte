<script lang="ts">
    import { page } from "$app/state";
    import UserCard from "$lib/Dashboard/UserCard.svelte";
    import type { OauthSession } from "$lib/interfaces/oidc";
    const session = $derived(page.data.session);
</script>

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