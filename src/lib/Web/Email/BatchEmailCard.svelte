<script lang="ts">
	import type { BatchEmailMessage } from '$lib/interfaces/v2/batchEmail';
	import Fa from 'svelte-fa';
	import { faCheck, faXmark, faEnvelope, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

	let {
		email,
		authorName,
		authorUid,
		formatDate
	}: {
		email: BatchEmailMessage;
		authorName: string | null;
		authorUid: string;
		formatDate: (ts: number) => string;
	} = $props();
</script>

<div
	class="card variant-ghost p-3 flex flex-col gap-3 lg:grid lg:grid-cols-[160px_1fr_2fr_100px_80px_36px] lg:items-center lg:gap-4 hover:variant-soft transition-colors"
>
	<!-- Date -->
	<span class="text-sm text-surface-500">
		{formatDate(email.sent_at)}
	</span>

	<!-- Author -->
	<div class="flex items-center gap-2 min-w-0">
		<a href="/web/users/{authorUid}" class="anchor truncate">
			{authorName || authorUid.slice(0, 8) + '…'}
		</a>
	</div>

	<!-- Subject -->
	<span class="truncate">{email.subject}</span>

	<!-- Recipient count, Status, Detail — same line on small screens -->
	<div class="flex items-center gap-4 lg:contents">
		<div class="flex items-center gap-1 text-surface-600">
			<Fa icon={faEnvelope} size="sm" />
			<span>{email.recipient_uids.length}</span>
		</div>

		{#if email.success}
			<span class="badge variant-filled-success badge-sm w-fit">
				<Fa icon={faCheck} size="sm" />
			</span>
		{:else}
			<span class="badge variant-filled-error badge-sm w-fit">
				<Fa icon={faXmark} size="sm" />
			</span>
		{/if}

		<a href="/web/email/{email.id}" class="btn-icon btn-icon-sm variant-ghost-primary">
			<Fa icon={faMagnifyingGlass} />
		</a>
	</div>
</div>
