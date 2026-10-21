<script lang="ts">
	import Fa from 'svelte-fa';
	import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';

	let {
		dialog = $bindable(),
		count,
		excluded,
		busy,
		error,
		onconfirm
	}: {
		dialog: HTMLDialogElement | undefined;
		count: number;
		excluded: number;
		busy: boolean;
		error: string;
		onconfirm: () => void;
	} = $props();
</script>

<Dialog bind:dialog classProp="w-[90vw] sm:w-[32rem]">
	<div class="p-6 space-y-4" data-testid="resend-confirm">
		<h2 class="h3">{m.INVITEE_RESEND_CONFIRM_TITLE()}</h2>
		<p class="font-semibold">{m.INVITEE_RESEND_CONFIRM_COUNT({ count })}</p>
		{#if excluded > 0}
			<p class="text-sm">{m.INVITEE_RESEND_CONFIRM_EXCLUDED({ count: excluded })}</p>
		{/if}
		<p class="text-sm">{m.INVITEE_RESEND_CONFIRM_PACE()}</p>
		{#if error}
			<p class="text-sm text-error-700-200-token" data-testid="resend-confirm-error">{error}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<button type="button" class="btn min-h-11 variant-ghost-surface" disabled={busy} onclick={() => dialog?.close()}>
				{m.CANCEL()}
			</button>
			<button type="button" class="btn min-h-11 variant-filled-primary" disabled={busy} onclick={onconfirm}>
				<span><Fa icon={faPaperPlane} /></span>
				<span>{m.INVITEE_RESEND_CONFIRM_BUTTON()}</span>
			</button>
		</div>
	</div>
</Dialog>
