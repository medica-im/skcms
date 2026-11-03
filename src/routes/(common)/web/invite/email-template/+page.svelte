<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { replaceState } from '$app/navigation';
	import { untrack } from 'svelte';
	import Fa from 'svelte-fa';
	import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import TemplateEditor from '$lib/Web/Email/Template/TemplateEditor.svelte';
	import TemplatePreview from '$lib/Web/Email/Template/TemplatePreview.svelte';
	import ImageGallery from '$lib/Web/Email/Template/ImageGallery.svelte';
	import {
		isDraftChanged,
		type EmailTemplateDraft,
		type TemplateSource
	} from '$lib/Web/Email/Template/emailTemplate';
	import { addressForTab, tabFromAddress } from '$lib/Web/Email/Template/tabAddress';
	import { getInvitationTemplate } from '../../../../../emailTemplate.remote';

	// The tab is in the address (?tab=preview) so a reload, and the server render
	// that precedes it, open the tab the browser has checked. Left at 0, the
	// browser restored "Aperçu" as checked above the content of "Contenu".
	// Computed from location, not page.url: replaceState does not update page.url.
	let tab = $state(tabFromAddress(page.url.search));

	$effect(() => {
		const address = addressForTab(location.href, tab);
		if (address !== location.href) replaceState(address, page.state);
	});

	/**
	 * The invitation email of this site's organization: its wording, a preview,
	 * and the images it links.
	 *
	 * The draft lives here rather than in the editor so that switching to the
	 * preview tab renders what is being typed, and switching back loses nothing.
	 */
	const template = $derived(await getInvitationTemplate());

	let draft = $state<EmailTemplateDraft>(
		untrack(() => ({
			subject: template?.subject ?? '',
			body: template?.body ?? '',
			body_text: template?.body_text ?? '',
			content_type: template?.content_type ?? 'html'
		}))
	);
	const unsaved = $derived(template ? isDraftChanged(draft, template) : false);


	const sourceBadge: Record<TemplateSource, { label: () => string; classes: string }> = {
		organization: { label: m.EMAIL_TEMPLATE_SOURCE_ORGANIZATION, classes: 'variant-filled-primary' },
		default: { label: m.EMAIL_TEMPLATE_SOURCE_DEFAULT, classes: 'variant-soft-surface' },
		builtin: { label: m.EMAIL_TEMPLATE_SOURCE_BUILTIN, classes: 'variant-soft-surface' }
	};
</script>

<svelte:head>
	<title>
		{m.EMAIL_TEMPLATE_TITLE()} - {capitalizeFirstLetter(page.data.organization?.formatted_name ?? '')}
	</title>
</svelte:head>

<div class="mx-auto w-full max-w-6xl space-y-6 p-4 py-4 md:py-8">
	<a href="{base}/web/invite/invitees" class="btn min-h-11 variant-ghost-surface">
		<span><Fa icon={faArrowLeft} /></span>
		<span class="capitalize">{m.invitation({ count: 2 })}</span>
	</a>

	<header class="space-y-2">
		<div class="flex flex-wrap items-center gap-3">
			<h1 class="h2">{m.EMAIL_TEMPLATE_TITLE()}</h1>
			{#if template}
				<span class="badge {sourceBadge[template.source].classes}" data-testid="template-source">
					{sourceBadge[template.source].label()}
				</span>
			{/if}
		</div>
		<p class="text-surface-600-300-token">{m.EMAIL_TEMPLATE_INTRO()}</p>
	</header>

	{#if !template}
		<p class="text-error-700-200-token" data-testid="template-load-failed">{m.EMAIL_TEMPLATE_LOAD_FAILED()}</p>
	{:else}
		<TabGroup>
			<Tab bind:group={tab} name="template" value={0}>
				{m.EMAIL_TEMPLATE_BODY()}
				{#if unsaved}<span class="badge-icon variant-filled-warning ml-1" aria-label={m.EMAIL_TEMPLATE_UNSAVED()}>•</span>{/if}
			</Tab>
			<Tab bind:group={tab} name="preview" value={1}>{m.EMAIL_TEMPLATE_PREVIEW()}</Tab>
			<Tab bind:group={tab} name="images" value={2}>{m.EMAIL_IMAGE_TITLE()}</Tab>
			<svelte:fragment slot="panel">
				{#if tab === 0}
					<TemplateEditor {template} bind:draft />
				{:else if tab === 1}
					<TemplatePreview
						{draft}
						example={{
							name: template.placeholder_values.invitee_name ?? '',
							email: template.placeholder_values.invitee_email ?? ''
						}}
					/>
				{:else}
					<ImageGallery canEdit={template.can_edit} />
				{/if}
			</svelte:fragment>
		</TabGroup>
	{/if}
</div>
