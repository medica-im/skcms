<script lang="ts">
	import { fly } from 'svelte/transition';
	import * as m from '$msgs';
	import { page } from '$app/state';
	import Fa from 'svelte-fa';
	import { providers } from '$lib/Auth/data.ts'; 
	import { SignIn } from '@auth/sveltekit/components';
</script>
	<header>
		<div class="section-container">
			<h1 class="h1">{m.LOGIN()}</h1>
		</div>
	</header>

	<section
		class="container"
		in:fly={{ x: -100, duration: 500, delay: 500 }}
		out:fly={{ duration: 500 }}
	>
		<div class="section-container">
			<div class="grid cols-1 gap-6">
				{#each providers as provider}
					<SignIn
						options={{
							redirectTo: page.data.redirectTo
								? `/api/v2/auth?redirect=${decodeURIComponent(page.data.redirectTo).slice(1)}`
								: `/api/v2/auth?redirect=dashboard`
						}}
						provider={provider.name}
						signInPage="signin"
						class="gap-2 p-4 variant-ghost w-fit"
					>
						<div class="flex gap-2 place-items-center" slot="submitButton">
							<Fa icon={provider.icon} />
							{m.SIGNIN()}
							{m.with()} {provider.label}
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
