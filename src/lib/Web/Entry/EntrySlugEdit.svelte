<script lang="ts">
	/**
	 * Changing an entry's address (its slug), beside it on the entry page in edit mode.
	 *
	 * The permission comes from the page's server load, per user and never cached
	 * (backend /entries/{uid}/slug/permission): the owner, administrators and
	 * superusers. The address is checked as it is typed, with the free ones offered when
	 * it is taken, and Save waits for one the server just said is free. The old address
	 * redirects to the new one, so on success the page moves there.
	 */
	import Fa from 'svelte-fa';
	import { faCheck, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';
	import SlugFeedback from '$lib/Web/Slug/SlugFeedback.svelte';
	import { slugView, type SlugCheck } from '$lib/Web/Slug/slugView.ts';
	import { changeEntrySlug, checkEntrySlug } from '../../../entry.remote';

	let {
		entryUid,
		slug,
		permission
	}: { entryUid: string; slug: string; permission: { allowed: boolean } | null | undefined } = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let typed = $state('');
	let check: SlugCheck | null = $state(null);
	let pending = $state(false);
	let failed = $state(false);
	let focused = $state(false);
	let busy = $state(false);
	let saved = $state(false);
	let refusal: string | undefined = $state();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let latest = 0;

	const view = $derived(
		slugView({
			typed,
			original: slug,
			check,
			pending,
			failed,
			focused,
			wording: { taken: m.ENTRY_SLUG_TAKEN(), changed: m.ENTRY_SLUG_REDIRECT() }
		})
	);
	const canSave = $derived(!busy && view.canConfirm && view.changed);

	function open() {
		typed = slug;
		check = null;
		pending = false;
		failed = false;
		refusal = undefined;
		saved = false;
		dialog?.showModal();
	}

	async function ask(asked: string) {
		const id = ++latest;
		pending = true;
		failed = false;
		try {
			const answer = await checkEntrySlug({ uid: entryUid, slug: asked });
			if (id === latest) check = answer;
		} catch (error) {
			console.error(error);
			if (id === latest) failed = true;
		} finally {
			if (id === latest) pending = false;
		}
	}

	function later(delay = 300) {
		clearTimeout(timer);
		pending = true;
		const asked = typed.trim();
		timer = setTimeout(() => ask(asked), delay);
	}

	function choose(suggestion: string) {
		typed = suggestion;
		clearTimeout(timer);
		ask(suggestion);
	}

	const refusalText = (status: number, code: string | undefined) =>
		code === 'taken' ? m.ENTRY_SLUG_TAKEN() : status === 403 ? m.ENTRY_SLUG_ERROR_NOT_ALLOWED() : m.ENTRY_SLUG_ERROR_FAILED();

	async function save() {
		if (!canSave) return;
		busy = true;
		refusal = undefined;
		try {
			const result = await changeEntrySlug({ uid: entryUid, slug: typed.trim() });
			if (result.success && result.slug) {
				saved = true;
				await goto(`${base}/e/${result.slug}`, { invalidateAll: true });
				dialog?.close();
			} else {
				refusal = refusalText(result.status, result.code);
			}
		} catch {
			refusal = m.ENTRY_SLUG_ERROR_FAILED();
		} finally {
			busy = false;
		}
	}
</script>

{#if permission?.allowed}
	<button
		type="button"
		class="btn-icon variant-ghost-surface min-h-11 min-w-11"
		title={m.ENTRY_SLUG_EDIT()}
		aria-label={m.ENTRY_SLUG_EDIT()}
		onclick={open}
		data-testid="entry-slug-edit"
	>
		<Fa icon={faPenToSquare} />
	</button>

	<Dialog bind:dialog classProp="w-[90vw] sm:w-[36rem]">
		<div class="p-6 space-y-4 text-base" data-testid="entry-slug-dialog">
			<h2 class="h3">{m.ENTRY_SLUG_TITLE()}</h2>
			<p>
				<span class="text-surface-600-300-token">{m.ENTRY_SLUG_CURRENT()}</span>
				<span class="font-semibold break-all">/e/{slug}</span>
			</p>
			<label class="label flex w-full flex-col items-start gap-1">
				<span>{m.ENTRY_SLUG_LABEL()}</span>
				<input
					class="input w-full min-h-[44px] text-base {view.status === 'taken' || view.status === 'invalid' ? 'input-error' : ''}"
					type="text"
					autocomplete="off"
					spellcheck="false"
					bind:value={typed}
					oninput={() => later()}
					onfocus={() => (focused = true)}
					onblur={() => (focused = false)}
				/>
			</label>
			<p class="text-surface-600-300-token break-all" data-testid="entry-slug-url">{page.url.origin}{base}/e/{typed}</p>
			<SlugFeedback {view} onchoose={choose} />
			{#if refusal}
				<p class="text-error-700-200-token" data-testid="entry-slug-refusal">{refusal}</p>
			{/if}
			<div class="flex flex-wrap items-center justify-end gap-2">
				{#if saved}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					<span>{m.ENTRY_SLUG_SAVED()}</span>
				{/if}
				<button type="button" class="btn min-h-11 variant-ringed-surface text-surface-900-50-token" onclick={() => dialog?.close()} disabled={busy}>
					{m.CANCEL()}
				</button>
				<button type="button" class="btn min-h-11 variant-filled-primary" disabled={!canSave} onclick={save} data-testid="entry-slug-save">
					{m.ENTRY_SLUG_SAVE()}
				</button>
			</div>
		</div>
	</Dialog>
{/if}
