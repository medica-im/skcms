<script lang="ts">
	import type { PageData } from './$types';
	import type { BatchEmailMessageDetail } from '$lib/interfaces/v2/batchEmail';
	import type { User } from '$lib/interfaces/v2/user';
	import Fa from 'svelte-fa';
	import { faArrowLeft, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

	let { data }: { data: PageData } = $props();
	let email = $derived(data.email as BatchEmailMessageDetail | undefined);
	let users = $derived(data.users as User[] | undefined);

	let userMap = $derived(new Map((users ?? []).map((u) => [u.uid, u])));

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${day}/${month}/${year} ${hours}:${minutes}`;
	}

	function getUserName(uid: string): string {
		return userMap.get(uid)?.name || uid.slice(0, 8) + '…';
	}
</script>

{#if email}
	<div class="container mx-auto p-4 max-w-4xl space-y-4">
		<!-- Back button -->
		<a href="/web/email" class="btn btn-sm variant-ghost-surface">
			<Fa icon={faArrowLeft} class="mr-2" />
			Retour
		</a>

		<div class="card p-6 space-y-4">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<h2 class="h2">{email.subject}</h2>
				{#if email.success}
					<span class="badge variant-filled-success">
						<Fa icon={faCheck} size="sm" class="mr-1" />
						Envoyé
					</span>
				{:else}
					<span class="badge variant-filled-error">
						<Fa icon={faXmark} size="sm" class="mr-1" />
						Erreur
					</span>
				{/if}
			</div>

			<!-- Meta -->
			<div class="space-y-2 text-sm">
				<!-- From -->
				<div class="flex gap-2">
					<span class="font-semibold text-surface-500 w-12">De</span>
					<a href="/web/users/{email.author_uid}" class="anchor">
						{getUserName(email.author_uid)}
					</a>
				</div>

				<!-- Date -->
				<div class="flex gap-2">
					<span class="font-semibold text-surface-500 w-12">Date</span>
					<span>{formatDate(email.sent_at)}</span>
				</div>

				<!-- To -->
				<div class="flex gap-2">
					<span class="font-semibold text-surface-500 w-12 flex-shrink-0 pt-1">À</span>
					<div class="max-h-48 overflow-y-auto flex flex-wrap gap-1">
						{#each email.recipient_uids as uid (uid)}
							<a href="/web/users/{uid}" class="chip variant-filled hover:variant-soft-primary transition-colors no-underline">
								{getUserName(uid)}
							</a>
						{/each}
					</div>
				</div>
			</div>

			<hr class="!border-t-2" />

			<!-- Body -->
			<div class="whitespace-pre-wrap text-base leading-relaxed">
				{email.body}
			</div>
		</div>
	</div>
{:else}
	<div class="container mx-auto p-4">
		<div class="alert variant-filled-error">
			<p>Message introuvable.</p>
		</div>
	</div>
{/if}
