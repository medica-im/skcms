<script lang="ts">
	import { Invitee } from '$lib/Invitee';
	import { preloadData, pushState, goto } from '$app/navigation';
	import { faPlus } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let invitees = $derived(data.invitees);
</script>

<div class="container mx-auto p-4">
	<header class="mb-6 flex justify-between items-center">
		<div>
			<h1 class="h1 mb-2">Invitations</h1>
			<p class="text-surface-600">
				{invitees.length} invitation{invitees.length > 1 ? 's' : ''}
			</p>
		</div>
		<a
			href="/web/invite/create"
			onclick={async (e) => {
				if (e.shiftKey || e.metaKey || e.ctrlKey) return;

				e.preventDefault();
				const { href } = e.currentTarget;
				const result = await preloadData(href);

				if (result.type === 'loaded' && result.status === 200) {
					pushState(href, { selected: result.data });
				} else {
					goto(href);
				}
			}}
		>
			<button class="btn variant-filled-primary" title="Créer une invitation">
				<span><Fa icon={faPlus} /></span>
				<span>Créer une invitation</span>
			</button>
		</a>
	</header>

	<div class="grid grid-cols-1 gap-2">
		{#each invitees as invitee (invitee.uid)}
			<Invitee {invitee} />
		{/each}
	</div>
</div>
