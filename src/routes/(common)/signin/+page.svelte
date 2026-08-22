<script lang="ts">
	import { fly } from 'svelte/transition';
	import * as m from '$msgs';
	import { page } from '$app/state';
	import Fa from 'svelte-fa';
	import { providers } from '$lib/Auth/data.ts'; 
	import { SignIn } from '@auth/sveltekit/components';
	import { base } from '$app/paths';

	// SignIn builds action={`/${signInPage}`} with no base path, so on an
	// instance served under one the form posts to the site root — WordPress, on
	// unipa.fr — rather than to the app. This prop is the only hook the library
	// offers, hence the leading slash being stripped back off here.
	//
	// `base` is '' for every site served at its own root, so this is exactly
	// "signin" there and the emitted action stays "/signin".
	const signInPath = base ? `${base.slice(1)}/signin` : 'signin';
	const redirectParam = page.url.searchParams.get('redirect');
	const redirect = redirectParam ? redirectParam : '/dashboard';
	const redirectTo = encodeURI(`${redirect}`);
</script>

<svelte:head>
	<link rel="canonical" href="{base}/signin" />
</svelte:head>
	<header>
		<div class="section-container">
			<h1 class="h1">{m.LOGIN()}</h1>
		</div>
	</header>

	<section
		in:fly={{ x: -100, duration: 500, delay: 500 }}
		out:fly={{ duration: 500 }}
	>
		<div class="section-container">
			<div class="flex flex-col items-center gap-6">
				{#each providers as provider}
					<SignIn
						options={{
							redirect: true,
							redirectTo: redirectTo
						}}
						provider={provider.name}
						signInPage={signInPath}
					>
						<div class="btn variant-filled-primary flex gap-2 place-items-center" slot="submitButton">
							<Fa icon={provider.icon} />
							{m.SIGNIN()}
							{m.with()} {provider.label}
							<input type="hidden" name="redirectTo" value={redirectTo} />
						</div>
					</SignIn>
				{/each}
			</div>
		</div>
	</section>

<style lang="postcss">
	.section-container {
		@apply mx-auto flex w-full max-w-7xl items-center justify-center p-4 py-8;
	}
</style>
