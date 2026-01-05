<script lang="ts">
	import { fly } from 'svelte/transition';
	import * as m from "$msgs";
	import { page } from '$app/state';
	import Fa from 'svelte-fa';
	import { providers } from '$lib/Auth/data.ts'; 
	import { SignOut } from '@auth/sveltekit/components';

	let session = $derived(page.data.session);
    let provider = providers.find(e=>e.name==session?.user?.provider)
</script>
	<header>
		<div class="section-container">
			<h1 class="h1">{m.signout()}</h1>
		</div>
	</header>
    {#if provider}
	<section
		class="container"
		in:fly={{ x: -100, duration: 500, delay: 500 }}
		out:fly={{ duration: 500 }}
	>
		<div class="section-container">
			<div class="grid cols-1 gap-6">
					<SignOut
						onclick={()=>{
							console.log("signOut");
							localStorage.removeItem("entries");
							}}
						options={{
							redirectTo: page.data.redirectTo
								? `/${decodeURIComponent(page.data.redirectTo).slice(1)}`
								: `/`
						}}
						provider={provider?.name}
						signOutPage="signout"
						class="gap-2 p-4 variant-ghost w-fit"
					>
						<div class="flex gap-2 place-items-center" slot="submitButton">
							<Fa icon={provider?.icon} />
							{m.signout()} {m.from()} {provider.label}
						</div>
					</SignOut>
			</div>
		</div>
	</section>
	{/if}

<style lang="postcss">
	.section-container {
		@apply mx-auto flex w-full max-w-7xl items-center justify-center p-4 py-8;
	}
</style>
