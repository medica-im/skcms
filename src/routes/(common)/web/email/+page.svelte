<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import type { BatchEmailMessage } from '$lib/interfaces/v2/batchEmail';
	import type { User } from '$lib/interfaces/v2/user';
	import BatchEmailCard from '$lib/Web/Email/BatchEmailCard.svelte';
	import Fa from 'svelte-fa';
	import { faSort, faSortUp, faSortDown, faSearch, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

	let { data }: { data: PageData } = $props();
	let emails = $derived(data.emails as BatchEmailMessage[] | undefined);
	let users = $derived(data.users as User[] | undefined);

	// Build user map for resolving author UIDs
	let userMap = $derived(new Map((users ?? []).map((u) => [u.uid, u])));

	// Sort state: true = newest first (default), false = oldest first
	let sortDesc: boolean = $state(true);

	// Search
	let search: string = $state('');

	function getAuthorName(uid: string): string | null {
		return userMap.get(uid)?.name ?? null;
	}

	let filteredEmails = $derived.by(() => {
		let list = emails ?? [];
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			list = list.filter((e) => {
				const authorName = getAuthorName(e.author_uid)?.toLowerCase() ?? '';
				const authorUid = e.author_uid.toLowerCase();
				const subject = e.subject.toLowerCase();
				const recipientMatch = e.recipient_uids.some((uid) => uid.toLowerCase().includes(q));
				return (
					authorName.includes(q) ||
					authorUid.includes(q) ||
					subject.includes(q) ||
					recipientMatch
				);
			});
		}
		return [...list].sort((a, b) =>
			sortDesc ? b.sent_at - a.sent_at : a.sent_at - b.sent_at
		);
	});

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${day}/${month}/${year} ${hours}:${minutes}`;
	}
</script>

<div class="container mx-auto p-4">
	<header class="mb-6 flex items-start justify-between">
		<div>
			<h1 class="h1 mb-2">Email</h1>
			<p class="text-surface-600">
				{filteredEmails.length} message{filteredEmails.length !== 1 ? 's' : ''}
			</p>
		</div>
		<a href="/web/email/send" class="btn variant-filled-primary">
			<Fa icon={faPaperPlane} class="mr-2" />
			Nouveau message
		</a>
	</header>

	<!-- Search -->
	<div class="mb-4 max-w-md">
		<div class="input-group input-group-divider grid-cols-[auto_1fr]">
			<div class="input-group-shim"><Fa icon={faSearch} /></div>
			<input type="search" class="input" placeholder="Rechercher..." bind:value={search} />
		</div>
	</div>

	<!-- Column Headers (large screens only) -->
	<div class="hidden lg:grid lg:grid-cols-[160px_1fr_2fr_100px_80px_36px] lg:items-center lg:gap-4 px-3 pb-2 text-sm font-semibold text-surface-500">
		<button
			type="button"
			class="flex items-center gap-1 hover:text-surface-900 transition-colors"
			onclick={() => (sortDesc = !sortDesc)}
		>
			Date
			<Fa icon={sortDesc ? faSortDown : faSortUp} size="sm" />
		</button>
		<span>Auteur</span>
		<span>Objet</span>
		<span>Destinataires</span>
		<span>Statut</span>
		<span></span>
	</div>

	<!-- Email list -->
	<div class="grid grid-cols-1 gap-2">
		{#if filteredEmails.length > 0}
			{#each filteredEmails as email (email.id)}
				<BatchEmailCard
					{email}
					authorName={getAuthorName(email.author_uid)}
					authorUid={email.author_uid}
					{formatDate}
				/>
			{/each}
		{:else}
			<div class="card variant-ghost p-6 text-center text-surface-500">
				Aucun message trouvé.
			</div>
		{/if}
	</div>
</div>
