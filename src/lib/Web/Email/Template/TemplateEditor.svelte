<script lang="ts">
	import Fa from 'svelte-fa';
	import {
		faFloppyDisk,
		faFileImport,
		faRotateLeft,
		faCheck,
		faLock
	} from '@fortawesome/free-solid-svg-icons';
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';
	import CopyButton from './CopyButton.svelte';
	import {
		isDraftChanged,
		isInviteeField,
		placeholder,
		problemMessage,
		type EmailTemplate,
		type EmailTemplateDraft,
		type TemplateProblem
	} from './emailTemplate';
	import {
		getInvitationTemplate,
		resetEmailTemplate,
		saveEmailTemplate
	} from '../../../../emailTemplate.remote';

	/**
	 * Editing the organization's invitation email.
	 *
	 * The draft belongs to the page, so the preview tab renders exactly what is
	 * being typed, saved or not. Saving writes the organization's own template
	 * and never the default shared by every organization; the backend refuses
	 * what cannot be right (an unknown field, no sign-in link, MJML source) and
	 * each problem is shown under the field it is about.
	 */
	let {
		template,
		draft = $bindable()
	}: { template: EmailTemplate; draft: EmailTemplateDraft } = $props();

	// Seeing is for administrators; changing is for the role the organization
	// chose. The server enforces it -- this only avoids offering what it
	// would refuse.
	const readOnly = $derived(!template.can_edit);
	const initial = $derived(pick(template));
	const hasChanges = $derived(isDraftChanged(draft, initial));

	let busy = $state(false);
	let problems = $state<TemplateProblem[]>([]);
	let message = $state<{ ok: boolean; text: string } | undefined>();
	let resetDialog: HTMLDialogElement | undefined = $state();

	const canSave = $derived(!busy && hasChanges);
	const problemsFor = (field: string) => problems.filter((p) => p.field === field);

	function pick(t: EmailTemplateDraft): EmailTemplateDraft {
		return {
			subject: t.subject,
			body: t.body,
			body_text: t.body_text,
			content_type: t.content_type
		};
	}

	async function save() {
		if (!canSave) return;
		busy = true;
		message = undefined;
		const result = await saveEmailTemplate({ kind: 'invitation', ...draft });
		busy = false;
		problems = result.problems ?? [];
		if (result.success) {
			message = { ok: true, text: m.EMAIL_TEMPLATE_SAVED() };
		} else if (!result.problems) {
			message = { ok: false, text: m.EMAIL_TEMPLATE_FAILED() };
		}
	}

	async function reset() {
		busy = true;
		message = undefined;
		const result = await resetEmailTemplate('invitation');
		busy = false;
		resetDialog?.close();
		if (result.success) {
			const fresh = await getInvitationTemplate();
			if (fresh) draft = pick(fresh);
			problems = [];
			message = { ok: true, text: m.EMAIL_TEMPLATE_RESET_DONE() };
		} else {
			message = { ok: false, text: m.EMAIL_TEMPLATE_FAILED() };
		}
	}

	async function importFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			draft.body = await file.text();
			draft.content_type = 'html';
			problems = problems.filter((p) => p.field !== 'body');
		} catch {
			message = { ok: false, text: m.EMAIL_TEMPLATE_IMPORT_FAILED() };
		} finally {
			input.value = '';
		}
	}

	const placeholderDescription = (name: string): string => {
		const key = `EMAIL_TEMPLATE_PLACEHOLDER_${name}` as keyof typeof m;
		const describe = m[key] as unknown as (() => string) | undefined;
		return typeof describe === 'function' ? describe() : '';
	};
</script>

{#snippet fieldProblems(field: string)}
	{#each problemsFor(field) as problem, i (i)}
		<p class="text-sm text-error-700-200-token" data-testid="template-problem-{field}">
			{problemMessage(problem)}
		</p>
	{/each}
{/snippet}

<div class="space-y-6" data-testid="template-editor">
	{#if readOnly}
		<aside class="alert variant-soft-surface" data-testid="template-read-only">
			<div><Fa icon={faLock} /></div>
			<p class="alert-message">{m.EMAIL_TEMPLATE_READ_ONLY()}</p>
		</aside>
	{:else if template.source !== 'organization'}
		<p class="text-sm text-surface-600-300-token">{m.EMAIL_TEMPLATE_SOURCE_SHARED_HINT()}</p>
	{/if}

	<label class="label">
		<span>{m.EMAIL_TEMPLATE_SUBJECT()}</span>
		<input class="input" type="text" maxlength="998" bind:value={draft.subject} readonly={readOnly} data-testid="template-subject" />
		{@render fieldProblems('subject')}
	</label>

	<div class="space-y-2">
		<span class="block">{m.EMAIL_TEMPLATE_FORMAT()}</span>
		{#if readOnly}
			<p data-testid="template-format">
				{draft.content_type === 'html' ? m.EMAIL_TEMPLATE_FORMAT_HTML() : m.EMAIL_TEMPLATE_FORMAT_TEXT()}
			</p>
		{:else}
			<RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
				<RadioItem bind:group={draft.content_type} name="content_type" value="html">
					{m.EMAIL_TEMPLATE_FORMAT_HTML()}
				</RadioItem>
				<RadioItem bind:group={draft.content_type} name="content_type" value="text">
					{m.EMAIL_TEMPLATE_FORMAT_TEXT()}
				</RadioItem>
			</RadioGroup>
		{/if}
	</div>

	<div class="space-y-2">
		<div class="flex flex-wrap items-end justify-between gap-2">
			<label for="template-body">{m.EMAIL_TEMPLATE_BODY()}</label>
			{#if !readOnly}
				<label class="btn min-h-11 variant-soft-secondary cursor-pointer">
					<span><Fa icon={faFileImport} /></span>
					<span>{m.EMAIL_TEMPLATE_IMPORT_FILE()}</span>
					<input
						type="file"
						class="sr-only"
						accept=".html,.htm,text/html"
						onchange={importFile}
						data-testid="template-import"
					/>
				</label>
			{/if}
		</div>
		{#if draft.content_type === 'html'}
			<p class="text-sm text-surface-600-300-token">{m.EMAIL_TEMPLATE_BODY_HTML_HINT()}</p>
		{/if}
		<textarea
			id="template-body"
			class="textarea font-mono text-sm"
			rows="18"
			spellcheck="false"
			bind:value={draft.body}
			readonly={readOnly}
			data-testid="template-body"
		></textarea>
		{@render fieldProblems('body')}
	</div>

	{#if draft.content_type === 'html'}
		<label class="label">
			<span>{m.EMAIL_TEMPLATE_BODY_TEXT()}</span>
			<span class="block text-sm text-surface-600-300-token">{m.EMAIL_TEMPLATE_BODY_TEXT_HINT()}</span>
			<textarea
				class="textarea font-mono text-sm"
				rows="6"
				bind:value={draft.body_text}
				readonly={readOnly}
				data-testid="template-body-text"
			></textarea>
			{@render fieldProblems('body_text')}
		</label>
	{/if}

	<section class="space-y-2" aria-labelledby="placeholders-title">
		<h3 id="placeholders-title" class="h4">{m.EMAIL_TEMPLATE_PLACEHOLDERS()}</h3>
		<p class="text-sm text-surface-600-300-token">{m.EMAIL_TEMPLATE_PLACEHOLDERS_HINT()}</p>
		<!--
			A definition list: the field (a button that copies it), then what it
			is and what it prints here. The value is set apart visually, and for
			a screen reader by a spoken prefix rather than by the ";", which is
			hidden from it.
		-->
		<dl class="grid grid-cols-1 gap-3 lg:grid-cols-2" data-testid="template-placeholders">
			{#each template.placeholders as name (name)}
				{@const value = template.placeholder_values?.[name]}
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="placeholder-{name}">
					<dt>
						<CopyButton text={placeholder(name)} label={placeholder(name)} mono classes="btn variant-soft" />
					</dt>
					<dd class="text-sm">
						<span>{placeholderDescription(name)}</span>
						{#if template.required_placeholders.includes(name)}
							<span class="badge variant-soft-warning">{m.EMAIL_TEMPLATE_REQUIRED()}</span>
						{/if}
						{#if value}
							<span aria-hidden="true" class="text-surface-500">;</span>
							{#if isInviteeField(name)}
								<span class="text-surface-600-300-token">{m.EMAIL_TEMPLATE_VALUE_EXAMPLE()}</span>
							{:else}
								<span class="sr-only">{m.EMAIL_TEMPLATE_VALUE_ON_SITE()}</span>
							{/if}
							<span
								class="rounded-container-token bg-primary-500/10 px-1.5 py-0.5 font-medium break-all text-primary-800 dark:text-primary-200"
								class:italic={isInviteeField(name)}
								data-testid="placeholder-value">{value}</span
							>
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</section>

	{#if !readOnly}
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="btn min-h-11 variant-filled-primary"
				disabled={!canSave}
				onclick={save}
				data-testid="template-save"
			>
				<span><Fa icon={faFloppyDisk} /></span>
				<span>{m.EMAIL_TEMPLATE_SAVE()}</span>
			</button>
			{#if template.source === 'organization'}
				<button
					type="button"
					class="btn min-h-11 variant-ghost-surface"
					disabled={busy}
					onclick={() => resetDialog?.showModal()}
					data-testid="template-reset"
				>
					<span><Fa icon={faRotateLeft} /></span>
					<span>{m.EMAIL_TEMPLATE_RESET()}</span>
				</button>
			{/if}
			{#if hasChanges}
				<span class="badge variant-soft-warning" data-testid="template-unsaved">{m.EMAIL_TEMPLATE_UNSAVED()}</span>
			{:else if message}
				<span
					class="badge {message.ok ? 'variant-soft-success' : 'variant-soft-error'}"
					data-testid="template-message"
				>
					{#if message.ok}<span><Fa icon={faCheck} /></span>{/if}
					<span>{message.text}</span>
				</span>
			{/if}
		</div>
		{#if hasChanges && message && !message.ok}
			<p class="text-sm text-error-700-200-token">{message.text}</p>
		{/if}
	{/if}
</div>

<Dialog bind:dialog={resetDialog} classProp="w-[90vw] sm:w-[28rem]">
	<div class="p-6 space-y-4">
		<h2 class="h3">{m.EMAIL_TEMPLATE_RESET()}</h2>
		<p>{m.EMAIL_TEMPLATE_RESET_CONFIRM_TEXT()}</p>
		<div class="flex justify-end gap-2">
			<button type="button" class="btn min-h-11 variant-ghost-surface" onclick={() => resetDialog?.close()} disabled={busy}>
				{m.CANCEL()}
			</button>
			<button type="button" class="btn min-h-11 variant-filled-error" onclick={reset} disabled={busy} data-testid="template-reset-confirm">
				{m.EMAIL_TEMPLATE_RESET()}
			</button>
		</div>
	</div>
</Dialog>
