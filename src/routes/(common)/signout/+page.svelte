<script lang="ts">
	import { fly } from 'svelte/transition';
	import * as m from "$msgs";
	import { page } from '$app/state';
	import Fa from 'svelte-fa';
	import { providers } from '$lib/Auth/data.ts'; 
	import { SignOut } from '@auth/sveltekit/components';
	import { base } from '$app/paths';

	// SignOut builds action={`/${signOutPage}`} with no base path, exactly like
	// SignIn. On an instance served under one the form posts to the site root —
	// WordPress, on unipa.fr — and the HTML 404 that comes back is what fails
	// as "Unexpected token '<' ... is not valid JSON".
	//
	// `base` is '' for a site at its own root, so this stays "signout" there.
	const signOutPath = base ? `${base.slice(1)}/signout` : 'signout';

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
						signOutPage={signOutPath}
						provider={provider?.name}
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
