<script lang="ts">
	import { page } from '$app/state';
	import { userRoles } from '$lib/auth/roles.ts';
	import { mintExportToken } from '../../../../../clone.remote.ts';

	let { data } = $props();
	const r = $derived(userRoles(page.data?.user?.role));
	let busy = $state(false);
	let error = $state<string | null>(null);

	async function approve() {
		busy = true;
		error = null;
		const res = await mintExportToken({ target_origin: data.target });
		busy = false;
		if (!res.ok) {
			error = res.detail || `This instance refused the request (${res.status}).`;
			return;
		}
		// The fragment, not the query string: fragments never reach a server, do
		// not land in access logs and do not survive in document.referrer.
		window.location.href =
			`${data.target}${data.returnTo}#token=${encodeURIComponent(res.token)}` +
			`&instance=${encodeURIComponent(data.instance)}`;
	}
</script>

<svelte:head><title>Autoriser le clonage</title></svelte:head>

<div class="mx-auto w-full max-w-2xl p-4 py-8">
	{#if !r.SuperUser}
		<aside class="alert variant-ghost-error">
			<div class="alert-message"><h3 class="h3">Réservé aux superutilisateurs</h3></div>
		</aside>
	{:else if data.targetError}
		<aside class="alert variant-filled-error">
			<div class="alert-message">
				<h3 class="h3">Instance cible invalide</h3>
				<p>{data.targetError}</p>
			</div>
		</aside>
	{:else}
		<div class="card variant-soft p-4 space-y-4">
			<h1 class="h2">Autoriser la lecture de cet annuaire</h1>
			<p>
				<strong class="break-all">{data.target}</strong> demande à lire cet annuaire
				pendant 15&nbsp;minutes, en votre nom.
			</p>
			<p class="text-sm opacity-75">
				L'autorisation porte sur les fiches de cet annuaire : noms, adresses,
				téléphones et courriels. Elle expire seule.
			</p>
			{#if error}
				<aside class="alert variant-filled-error"><div class="alert-message">{error}</div></aside>
			{/if}
			<div class="flex gap-2">
				<button class="btn variant-filled-primary" disabled={busy || !data.target} onclick={approve}>
					{busy ? 'Autorisation…' : 'Autoriser'}
				</button>
				<a class="btn variant-ghost" href={data.target || '/'}>Annuler</a>
			</div>
		</div>
	{/if}
</div>
