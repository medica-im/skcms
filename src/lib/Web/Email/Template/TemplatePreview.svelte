<script lang="ts">
	import Fa from 'svelte-fa';
	import { faRotate } from '@fortawesome/free-solid-svg-icons';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import * as m from '$msgs';
	import { problemMessage, type EmailPreview, type EmailTemplateDraft } from './emailTemplate';
	import { previewEmailTemplate } from '../../../../emailTemplate.remote';

	/**
	 * The draft rendered by the backend exactly as it would be sent, to a
	 * made-up invitee whose name and address can be changed to try the
	 * conditionals (an invitee without a name, say).
	 *
	 * The html goes into an iframe with an empty sandbox: it is markup pasted by
	 * an administrator, and the empty sandbox stops any script in it from
	 * running and any link from navigating this page. srcdoc rather than a URL,
	 * so nothing is stored to be previewed.
	 */
	let { draft }: { draft: EmailTemplateDraft } = $props();

	// Blank means "the backend's made-up invitee".
	let inviteeName = $state('');
	let inviteeEmail = $state('');
	let preview = $state<EmailPreview | undefined>();
	let failure = $state<string | undefined>();
	let loading = $state(false);
	let tab = $state(0);
	let latest = 0;

	async function run(request: Parameters<typeof previewEmailTemplate>[0]) {
		const ticket = ++latest;
		loading = true;
		const result = await previewEmailTemplate(request);
		// A slower answer to an older draft must not replace a newer one.
		if (ticket !== latest) return;
		loading = false;
		if (result.success && result.data) {
			preview = result.data;
			failure = undefined;
			if (!preview.html) tab = 1;
		} else {
			failure = result.problems?.map(problemMessage).join(' ') || m.EMAIL_TEMPLATE_PREVIEW_FAILED();
		}
	}

	function request() {
		return {
			kind: 'invitation' as const,
			subject: draft.subject,
			body: draft.body,
			body_text: draft.body_text,
			content_type: draft.content_type,
			invitee_name: inviteeName.trim() || undefined,
			invitee_email: inviteeEmail.trim() || undefined
		};
	}

	// Re-render a moment after typing stops, rather than on every keystroke.
	$effect(() => {
		const snapshot = request();
		const timer = setTimeout(() => run(snapshot), 600);
		return () => clearTimeout(timer);
	});
</script>

<div class="space-y-4" data-testid="template-preview">
	<p class="text-sm text-surface-600-300-token">{m.EMAIL_TEMPLATE_PREVIEW_HINT()}</p>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<label class="label">
			<span>{m.EMAIL_TEMPLATE_PREVIEW_NAME()}</span>
			<input class="input" type="text" bind:value={inviteeName} placeholder="Camille Exemple" />
		</label>
		<label class="label">
			<span>{m.EMAIL_TEMPLATE_PREVIEW_EMAIL()}</span>
			<input class="input" type="email" bind:value={inviteeEmail} placeholder="camille.exemple@example.org" />
		</label>
	</div>

	<div class="flex flex-wrap items-center gap-2">
		<button type="button" class="btn min-h-11 variant-soft-primary" onclick={() => run(request())} disabled={loading}>
			<span><Fa icon={faRotate} spin={loading} /></span>
			<span>{m.EMAIL_TEMPLATE_PREVIEW_REFRESH()}</span>
		</button>
	</div>

	{#if failure}
		<p class="text-sm text-error-700-200-token" data-testid="preview-failure">{failure}</p>
	{/if}

	{#if preview}
		{#each preview.problems as problem, i (i)}
			<p class="text-sm text-warning-700-200-token" data-testid="preview-problem">{problemMessage(problem)}</p>
		{/each}

		<p class="rounded-container-token bg-surface-200-700-token p-3" data-testid="preview-subject-bar">
			<span class="font-semibold">{m.EMAIL_TEMPLATE_PREVIEW_SUBJECT()}</span>
			<span data-testid="preview-subject">{preview.subject}</span>
		</p>

		<TabGroup>
			{#if preview.html}
				<Tab bind:group={tab} name="preview-html" value={0}>{m.EMAIL_TEMPLATE_PREVIEW_HTML_TAB()}</Tab>
			{/if}
			<Tab bind:group={tab} name="preview-text" value={1}>{m.EMAIL_TEMPLATE_PREVIEW_TEXT_TAB()}</Tab>
			<svelte:fragment slot="panel">
				{#if tab === 0 && preview.html}
					<iframe
						title={m.EMAIL_TEMPLATE_PREVIEW_FRAME_TITLE()}
						srcdoc={preview.html}
						sandbox=""
						class="h-[70vh] w-full rounded-container-token border border-surface-300-600-token bg-white"
						data-testid="preview-frame"
					></iframe>
				{:else}
					<pre
						class="whitespace-pre-wrap break-words rounded-container-token bg-surface-100-800-token p-4 font-sans text-sm"
						data-testid="preview-text">{preview.text}</pre>
				{/if}
			</svelte:fragment>
		</TabGroup>
	{/if}
</div>
