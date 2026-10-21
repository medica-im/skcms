<script lang="ts">
	import { untrack } from 'svelte';
	import { base } from '$app/paths';
	import Fa from 'svelte-fa';
	import { faArrowLeft, faCheck } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import { updateInvitationSettings } from '$src/invitee.remote.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const result = $derived(updateInvitationSettings.result);
	const saved = $derived(result?.success ? result.resendAfterDays : data.resendAfterDays);
	let days = $state(untrack(() => data.resendAfterDays));
	const hasChanges = $derived(days !== saved);
	const disabled = $derived(!hasChanges || !days || Boolean(updateInvitationSettings.pending));
</script>

<div class="container mx-auto max-w-xl p-4 space-y-6">
	<a href="{base}/web/invite/invitees" class="btn min-h-11 variant-ghost">
		<span><Fa icon={faArrowLeft} /></span>
		<span>{m.INVITEE_BACK_TO_LIST()}</span>
	</a>

	<h1 class="h2">{m.INVITATION_SETTINGS_TITLE()}</h1>

	<form
		{...updateInvitationSettings.enhance(async ({ submit }) => {
			await submit();
		})}
		class="card p-4 space-y-4"
	>
		<label class="label">
			<span class="font-semibold">{m.INVITATION_SETTINGS_RESEND_AFTER()}</span>
			<input
				{...updateInvitationSettings.fields.resendAfterDays.as('number')}
				bind:value={days}
				class="input w-32 min-h-11"
				min="1"
				max="365"
				required
			/>
		</label>
		<p class="text-sm text-surface-600-300-token">{m.INVITATION_SETTINGS_RESEND_AFTER_HINT()}</p>

		<div class="flex items-center gap-3">
			<button type="submit" class="btn min-h-11 variant-filled-primary" {disabled}>
				{m.INVITATION_SETTINGS_SAVE()}
			</button>
			{#if result?.success && !hasChanges}
				<span class="flex items-center gap-2 text-success-700-200-token" role="status" data-testid="settings-saved">
					<Fa icon={faCheck} />
					<span>{m.INVITATION_SETTINGS_SAVED()}</span>
				</span>
			{:else if result && !result.success}
				<span class="text-error-700-200-token" role="alert">{m.INVITATION_SETTINGS_FAILED()}</span>
			{/if}
		</div>
	</form>
</div>
