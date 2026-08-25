<script lang="ts">
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';
	import { base } from '$app/paths';
	import { userRoles } from '$lib/auth/roles.ts';
	import { listInstances, listSourceEntries, preflight, executeClone } from '../../../../clone.remote.ts';
	import { cloneToken, takeTokenFromHash } from '$lib/Web/Clone/token.svelte.ts';
	import { partition, type Preflight } from '$lib/Web/Clone/cloneState.ts';

	/**
	 * Clone an entry from another deployment of this app.
	 *
	 * One route rather than four: the wizard's state is entirely client-side —
	 * peer, token, selection, resolutions — and serialising it through the URL to
	 * survive navigation would put a bearer credential into the address bar.
	 */
	const r = $derived(userRoles(page.data?.user?.role));

	let step = $state<'instance' | 'browse' | 'verify' | 'done'>('instance');
	let instances = $state<Array<{ name: string; display_name: string; origin: string }>>([]);
	let instance = $state('');
	let entries = $state<any[]>([]);
	let selected = $state<string[]>([]);
	let plans = $state<Preflight[]>([]);
	let queue = $state<Preflight[]>([]);
	let results = $state<any[]>([]);
	let busy = $state(false);
	let error = $state<string | null>(null);

	const token = $derived(cloneToken.value);
	const auto = $derived(partition(plans).auto);

	$effect(() => {
		// Two ways in, and both have to work.
		//
		// The callback route consumes the fragment and navigates here, so by the
		// time this runs the hash is usually already empty — reading it again and
		// stopping there is what sent an authorised superuser back to step one,
		// looping forever between "choose an instance" and "authorize".
		//
		// So: take a token from the hash if one is still there (a direct landing,
		// or a browser that skipped the callback), and otherwise trust what the
		// callback already put in memory.
		takeTokenFromHash();
		if (cloneToken.value && step === 'instance') {
			if (cloneToken.instance) instance = cloneToken.instance;
			step = 'browse';
		}
	});

	async function loadInstances() {
		instances = await listInstances();
	}
	loadInstances();

	function authorize() {
		const peer = instances.find((i) => i.name === instance);
		if (!peer) return;
		const target = window.location.origin;
		const back = `${base}/web/clone/callback`;
		window.location.href =
			`${peer.origin}${base}/web/clone/authorize` +
			`?target=${encodeURIComponent(target)}&return=${encodeURIComponent(back)}` +
			`&instance=${encodeURIComponent(peer.name)}`;
	}

	async function browse() {
		busy = true;
		error = null;
		const res = await listSourceEntries({ instance, token: token! });
		busy = false;
		if (!res.ok) {
			error = `The source refused the entry list (${res.status}).`;
			return;
		}
		entries = res.entries;
		step = 'browse';
	}

	async function check() {
		busy = true;
		error = null;
		const res = await preflight({ instance, token: token!, entry_uids: selected });
		busy = false;
		if (!res.ok) {
			error = `Preflight failed (${res.status}).`;
			return;
		}
		plans = res.entries;
		queue = partition(plans).prompted;
		step = 'verify';
	}

	async function run() {
		busy = true;
		const resolutions = plans
			.filter((p) => p.blockers.length === 0)
			.map((p) => ({
				source_uid: p.source_uid,
				effector: p.effector.default_resolution,
				effector_local_uid: p.effector.local_uid ?? null,
				facility: p.facility.default_resolution,
				facility_local_uid: p.facility.local_uid ?? null,
				facility_slug_override: null
			}));
		const res = await executeClone({ instance, token: token!, resolutions });
		results = res.results;

		// A clone writes an entry, and often a facility, into *this* instance.
		// The backend drops its own cached payloads, but this tab is still
		// holding the entries and facilities it loaded before — so the new entry
		// is absent from the directory, the map and the admin table until
		// something forces a refetch. Invalidating here means the links in the
		// results list below lead somewhere that already knows about them.
		//
		// Both keys: `app:entries` is declared by the root layout, and
		// `app:facilities` by the home page, which is what draws the map.
		if (res.results.some((x: { status: string }) => x.status === 'created')) {
			await Promise.all([invalidate('app:entries'), invalidate('app:facilities')]);
		}

		busy = false;
		step = 'done';
	}
</script>

<svelte:head><title>Cloner une fiche</title></svelte:head>

<div class="section-container">
	{#if !r.SuperUser}
		<aside class="alert variant-ghost-error">
			<div class="alert-message">
				<h3 class="h3">Réservé aux superutilisateurs</h3>
				<p>Le clonage lit les données d'une autre instance.</p>
			</div>
		</aside>
	{:else}
		<h1 class="h1 mb-4">Cloner une fiche</h1>

		{#if error}
			<aside class="alert variant-filled-error mb-4"><div class="alert-message">{error}</div></aside>
		{/if}

		{#if step === 'instance'}
			<div class="card variant-soft p-4 space-y-4">
				<h2 class="h3">1. Choisir l'instance source</h2>
				<select class="select" bind:value={instance}>
					<option value="">—</option>
					{#each instances as i}
						<option value={i.name}>{i.display_name}</option>
					{/each}
				</select>
				<p class="text-sm opacity-75">
					Vous serez redirigé vers cette instance pour vous identifier. L'autorisation
					dure 15&nbsp;minutes.
				</p>
				<button class="btn variant-filled-primary" disabled={!instance} onclick={authorize}>
					Se connecter à cette instance
				</button>
			</div>
		{:else if step === 'browse'}
			<div class="card variant-soft p-4 space-y-4">
				<h2 class="h3">2. Choisir les fiches</h2>
				{#if entries.length === 0}
					<button class="btn variant-filled-primary" disabled={busy} onclick={browse}>
						{busy ? 'Chargement…' : 'Charger les fiches'}
					</button>
				{:else}
					<p class="text-sm opacity-75">{entries.length} fiches — {selected.length} sélectionnées</p>
					<ul class="list max-h-96 overflow-y-auto">
						{#each entries as e}
							<li>
								<label class="flex items-center gap-2">
									<input type="checkbox" class="checkbox" value={e.uid} bind:group={selected} />
									<span>{e.name} — {e.effector_type?.label ?? ''}</span>
								</label>
							</li>
						{/each}
					</ul>
					<button class="btn variant-filled-primary" disabled={!selected.length || busy} onclick={check}>
						Vérifier {selected.length} fiche(s)
					</button>
				{/if}
			</div>
		{:else if step === 'verify'}
			<div class="card variant-soft p-4 space-y-4">
				<h2 class="h3">3. Vérifier</h2>
				{#if auto.length}
					<aside class="alert variant-ghost-success">
						<div class="alert-message">
							<strong>{auto.length}</strong> fiche(s) sans conflit, clonées sans intervention.
						</div>
					</aside>
				{/if}
				{#each plans as p}
					<div class="card variant-ghost p-3">
						<strong>{p.name}</strong>
						{#if p.blockers.length}
							{#each p.blockers as b}
								<p class="text-error-500 text-sm">⛔ {b.detail}</p>
							{/each}
						{:else}
							<p class="text-sm opacity-75">
								Personne : {p.effector.default_resolution === 'reuse' ? 'réutilisée' : 'créée'}
								· Établissement : {p.facility.default_resolution === 'reuse' ? 'réutilisé' : 'créé'}
							</p>
							{#each p.facility.matches as m}
								{#if m.differing_fields.length}
									<p class="text-warning-600 text-sm">
										⚠ {m.reason} — diffère sur : {m.differing_fields.join(', ')}
									</p>
								{/if}
							{/each}
						{/if}
						{#each p.warnings as w}<p class="text-sm opacity-75">ℹ {w}</p>{/each}
					</div>
				{/each}
				<button class="btn variant-filled-primary" disabled={busy} onclick={run}>
					{busy ? 'Clonage…' : 'Cloner'}
				</button>
			</div>
		{:else}
			<div class="card variant-soft p-4 space-y-3">
				<h2 class="h3">4. Résultat</h2>
				{#each results as res}
					<div class="flex items-center gap-3">
						<span class="badge {res.status === 'created' ? 'variant-filled-success' : 'variant-filled-error'}">
							{res.status}
						</span>
						{#if res.entry_slug}
							<a class="anchor" href="{base}/e/{res.entry_slug}">{res.entry_slug}</a>
						{:else}
							<span class="text-sm">{res.error}</span>
						{/if}
					</div>
					{#each res.warnings ?? [] as w}<p class="text-sm opacity-75 pl-4">ℹ {w}</p>{/each}
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-5xl p-4 py-8;
	}
</style>
