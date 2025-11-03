<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faInfo, faUser, faQuestion, faXmark } from '@fortawesome/free-solid-svg-icons';
	import { JsonView } from '@zerodevx/svelte-json-view';
	import { providers } from '$lib/Auth/data.ts';
	import defaultProfilePicture from '$assets/images/profile/default_profile_picture.png';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';

	let visible: boolean = $state(true);
	let session = $derived(page.data.session);
	let provider = providers.find((e) => e.name == session?.user?.provider);
	const profilePicture = page.data.user?.image || defaultProfilePicture;

	let user = $derived(page.data.user);

	const role = {
		administrator: m['ROLE.ADMINISTRATOR'](),
		superuser: m['ROLE.SUPERUSER'](),
		staff: m['ROLE.STAFF'](),
		anonymous: m['ROLE.ANONYMOUS']()
	};
</script>

<!--session?.user {session?.user}<br>
typeof session?.user {typeof session?.user}<br>
JSON.stringify(session?.user) {JSON.stringify(session?.user)}<br>
page.data?.user?.role {page.data?.user?.role}<br>
JSON.stringify(page.data?.user) {JSON.stringify(page.data?.user)}<br>
JSON.stringify(page.data?.session) {JSON.stringify(page.data?.session)}<br>
page.data?.user?.role {page.data?.user?.role}<br>
!page.data?.user?.role {!page.data?.user?.role}-->
<section class="section-container">
	<div class="grid grid-cols-1 gap-6 place-items-center">
		{#if page.data?.user?.role === 'anonymous'}
			{#if visible}
				<aside class="alert variant-ghost">
					<!-- Icon -->
					<div><Fa icon={faQuestion} size="3x" /></div>
					<!-- Message -->
					<div class="alert-message">
						<h3 class="h3">Bonjour {user?.name}!</h3>
						<p>
							Merci de votre visite. Votre email <q>{user?.email}</q> ne figure pas dans la liste
							des utilisateurs connus de ce service. Peut-être avons-nous enregistré une autre
							adresse de courrier électronique au moment de votre inscription? Si vous pensez qu'il
							s'agit d'une erreur, merci de nous
							<a href="/contact" class="anchor">contacter</a>.
						</p>
					</div>
					<!-- Actions -->
					<div class="alert-actions">
						<button
							onclick={() => {
								visible = false;
							}}
							class="btn-icon"><Fa icon={faXmark} size="2x" /></button
						>
					</div>
				</aside>
			{/if}
		{/if}

		<div class="max-w-sm bg-white shadow-lg rounded-lg overflow-hidden my-4">
			<img class="w-full h-56 object-cover object-center" src={profilePicture} alt="avatar" />
			{#if provider}
				<div class="flex items-center px-6 py-3 bg-gray-900">
					<h1 class="mx-3 text-white font-semibold text-lg">Authentifié par {provider.label}</h1>
					<Fa icon={provider.icon} />
				</div>
			{/if}
			<div class="flex flex-wrap py-4 px-6 gap-4">
				<h1 class="text-2xl font-semibold text-gray-800">{page.data.user.name}</h1>
				{#if import.meta.env.DEV}
					<Accordion>
						<AccordionItem>
							<svelte:fragment slot="lead"><Fa icon={faInfo} /></svelte:fragment>
							<svelte:fragment slot="summary">User details</svelte:fragment>
							<svelte:fragment slot="content"
								><div class="p-2 text-lg text-gray-700">
									<JsonView json={session} />
								</div></svelte:fragment
							>
						</AccordionItem>
					</Accordion>
				{/if}
				<div class="flex items-center mt-4 text-gray-700">
					<svg class="h-6 w-6 fill-current" viewBox="0 0 512 512">
						<path
							d="M437.332 80H74.668C51.199 80 32 99.198 32 122.667v266.666C32 412.802 51.199 432 74.668 432h362.664C460.801 432 480 412.802 480 389.333V122.667C480 99.198 460.801 80 437.332 80zM432 170.667L256 288 80 170.667V128l176 117.333L432 128v42.667z"
						/>
					</svg>
					<h1 class="px-2 text-sm">{page.data.user.email}</h1>
				</div>
				<div class="flex items-center mt-4 text-gray-700">
					<h1 class="px-2 text-sm">
						Rôle: {role[page.data?.user?.role as keyof object] || m['ROLE.ANONYMOUS']()}
					</h1>
				</div>
			</div>
		</div>
	</div>
</section>

<style lang="postcss">
	.section-container {
		@apply mx-auto flex w-full max-w-7xl items-center justify-center p-4 py-8;
	}
</style>
