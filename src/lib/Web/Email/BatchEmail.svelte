<script lang="ts">
	import { page } from '$app/state';
	import { InputChip } from '@skeletonlabs/skeleton';
	import { sendBatchEmail } from '../../../batchemail.remote.ts';
	import { setSelectedOwners, getSelectedOwners } from '$lib/components/Directory/context';
	import CtxDirectory from '$lib/components/Directory/CtxDirectory.svelte';
	import StepProgress from '$lib/Web/StepProgress.svelte';
	import Fa from 'svelte-fa';
	import { faPaperPlane, faArrowLeft, faCheck, faXmark, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import type { OwnerInfo } from '$lib/components/Directory/context';

	setSelectedOwners();

	let currentStep: number = $state(0);
	let recipientEmails: string[] = $state([]);
	let recipientMap: Map<string, OwnerInfo> = $state(new Map());

	const steps = $derived([
		{ label: 'Sélection', completed: currentStep > 0 },
		{ label: 'Rédaction', completed: currentStep > 1 },
		{ label: 'Envoi', completed: currentStep > 2 }
	]);

	const selectedOwners = getSelectedOwners();
	const hasSelection = $derived($selectedOwners.size > 0);

	// Compute recipient UIDs from emails that are still in the InputChip
	let recipientUids = $derived(
		[...recipientMap.values()]
			.filter((o) => recipientEmails.includes(o.email as string))
			.map((o) => o.uid)
			.join(',')
	);

	let formResult = $derived(sendBatchEmail.result);
	let disabled = $derived(
		!!sendBatchEmail.pending ||
		recipientEmails.length === 0 ||
		formResult?.success === true
	);

	function validateSelection() {
		const owners = $selectedOwners;
		recipientMap = new Map(owners);
		recipientEmails = [...owners.values()]
			.filter((o) => o.email)
			.map((o) => o.email as string)
			.filter((email, index, self) => self.indexOf(email) === index);
		currentStep = 1;
	}

	function cancel() {
		currentStep = 0;
		formResult = undefined;
	}
</script>

<div class="space-y-4 p-4">
	<StepProgress {steps} />

	{#if currentStep === 0}
		<div class="flex justify-end p-4">
			<button
				type="button"
				class="btn variant-filled-primary"
				disabled={!hasSelection}
				onclick={validateSelection}
			>
				Valider la sélection
			</button>
		</div>
		<CtxDirectory displaySelector={true} />
	{:else if currentStep === 1}
		<div class="card p-6 space-y-4 max-w-3xl mx-auto">
			<h3 class="h3">Rédiger l'email</h3>

			<label class="label">
				<span>Destinataires</span>
				<InputChip
					bind:value={recipientEmails}
					name="recipients_display"
					allowDuplicates={false}
					chips="variant-filled-primary"
					placeholder="..."
				/>
			</label>

			<form
				{...sendBatchEmail.enhance(async ({ submit }) => {
					try {
						await submit();
						if (sendBatchEmail.result?.success) {
							currentStep = 2;
						}
					} catch (error) {
						console.error(error);
					}
				})}
			>
				<input type="hidden" name="recipient_uids" bind:value={recipientUids} />
				<input type="hidden" name="author_uid" value={page.data.user.uid} />

				<div class="space-y-4">
					<label class="label">
						<span>Objet</span>
						<input
							type="text"
							class="input"
							name="subject"
							placeholder="Objet du message"
							required
						/>
					</label>

					<label class="label">
						<span>Message</span>
						<textarea
							class="textarea"
							name="body"
							rows="10"
							placeholder="Contenu du message..."
							required
						></textarea>
					</label>

					{#if formResult?.success === false}
						<div class="flex gap-2 items-center">
							<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
							<span class="text-base">{formResult?.text}</span>
						</div>
					{/if}

					<div class="flex justify-between">
						<button type="button" class="btn variant-ghost-surface" onclick={cancel}>
							<Fa icon={faArrowLeft} class="mr-2" />
							Annuler
						</button>
						<button
							type="submit"
							class="btn variant-filled-primary"
							{disabled}
						>
							<Fa icon={faPaperPlane} class="mr-2" />
							Envoyer
						</button>
					</div>
				</div>
			</form>
		</div>

	{:else if currentStep === 2}
		<div class="card p-6 space-y-4 max-w-3xl mx-auto text-center">
			{#if formResult?.success}
				<div class="flex justify-center">
					<div class="w-16 h-16 rounded-full variant-filled-success flex items-center justify-center">
						<Fa icon={faCheck} size="2x" />
					</div>
				</div>
				<p class="text-lg">{formResult?.data?.message || 'Emails envoyés avec succès.'}</p>
			{:else}
				<div class="flex justify-center">
					<div class="w-16 h-16 rounded-full variant-filled-error flex items-center justify-center">
						<Fa icon={faXmark} size="2x" />
					</div>
				</div>
				<p class="text-lg">Erreur: {formResult?.text}</p>
			{/if}
			<button type="button" class="btn variant-ghost-primary" onclick={cancel}>
				<Fa icon={faArrowLeft} class="mr-2" />
				Retour
			</button>
		</div>
	{/if}
</div>
