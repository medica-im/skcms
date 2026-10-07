<script lang="ts">
	/**
	 * Changing an entry's effector type, next to the type on the entry page.
	 *
	 * The permission comes from the page's server load, per user and never
	 * cached (backend /entries/{uid}/effector-type/permission), so the pen and
	 * the write agree:
	 * - allowed: the usual edit pen; a dialog with the creation picker, the
	 *   tags the change would remove, and Save once a different type is chosen;
	 * - expired / no_date: the pen barred; a dialog saying why (the
	 *   organization's window) and offering to recreate the entry with the same
	 *   place and person, then to deactivate this one;
	 * - not_allowed, or no permission: nothing.
	 *
	 * The slug names the type, so a change moves the page: on success it goes
	 * to the new slug (the old one redirects there).
	 */
	import Fa from 'svelte-fa';
	import { faPenToSquare, faCheck, faPlus } from '@fortawesome/free-solid-svg-icons';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';
	import OfferedEffectorTypeSelect from '$lib/Web/OfferedEffectorTypeSelect.svelte';
	import EntryToggleActive from '$lib/Web/Entry/EntryToggleActive.svelte';
	import { changeEntryType, previewEntryTypeChange, type RemovedTag } from '../../../entry.remote';
	import {
		lockedExplanation,
		recreateEntryHref,
		typeChangeRefusal,
		type TypeEditPermission
	} from './entryType';

	let {
		entryUid,
		currentType,
		facilityUid,
		effectorUid,
		active,
		permission
	}: {
		entryUid: string;
		currentType: { uid: string; label: string | null };
		facilityUid: string | undefined;
		effectorUid: string | undefined;
		active: boolean;
		permission: TypeEditPermission | null | undefined;
	} = $props();

	const shown = $derived(!!permission && permission.reason !== 'not_allowed');
	const allowed = $derived(!!permission?.allowed);

	let dialog: HTMLDialogElement | undefined = $state();
	let selected: { label: string; value: string } | undefined = $state();
	let removedTags: RemovedTag[] = $state([]);
	let busy = $state(false);
	let saved = $state(false);
	let refusal: { text: string; slug?: string } | undefined = $state();

	const canSave = $derived(!busy && !!selected && selected.value !== currentType.uid);

	function open() {
		selected = undefined;
		removedTags = [];
		refusal = undefined;
		saved = false;
		dialog?.showModal();
	}

	// The tags the change would remove, shown before saving. The command is
	// called untracked: it counts its pending calls in a $state it reads and
	// writes, so called tracked it made this effect depend on its own call and
	// re-run endlessly -- a thousand previews, the page frozen, the picker's
	// list left open over Save.
	const selectedUid = $derived(selected?.value);
	$effect(() => {
		const type = selectedUid;
		removedTags = [];
		if (!allowed || !type || type === currentType.uid) return;
		untrack(() => previewEntryTypeChange({ uid: entryUid, effector_type: type })).then((answer) => {
			if (selectedUid === type) removedTags = answer.removedTags;
		});
	});

	async function save() {
		if (!canSave || !selected) return;
		busy = true;
		refusal = undefined;
		try {
			const result = await changeEntryType({ uid: entryUid, effector_type: selected.value });
			if (result.success && result.slug) {
				saved = true;
				await goto(`${base}/e/${result.slug}`, { invalidateAll: true });
				dialog?.close();
			} else {
				refusal = {
					text: typeChangeRefusal(result.code, permission?.window_days ?? null),
					slug: result.code === 'duplicate' ? result.slug : undefined
				};
			}
		} catch {
			refusal = { text: typeChangeRefusal(undefined) };
		} finally {
			busy = false;
		}
	}
</script>

{#if shown}
	{#if allowed}
		<button
			type="button"
			class="btn-icon min-h-11 min-w-11"
			title={m.ENTRY_TYPE_EDIT()}
			aria-label={m.ENTRY_TYPE_EDIT()}
			onclick={open}
			data-testid="entry-type-edit"
		>
			<Fa icon={faPenToSquare} />
		</button>
	{:else}
		<!-- The same pen, struck through in red: the control exists but no longer applies. -->
		<button
			type="button"
			class="btn-icon min-h-11 min-w-11 relative text-error-600-300-token"
			title={m.ENTRY_TYPE_EDIT_LOCKED()}
			aria-label={m.ENTRY_TYPE_EDIT_LOCKED()}
			onclick={open}
			data-testid="entry-type-edit-locked"
		>
			<Fa icon={faPenToSquare} />
			<span
				aria-hidden="true"
				class="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-6 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current"
			></span>
		</button>
	{/if}

	<Dialog bind:dialog classProp="w-[90vw] sm:w-[32rem]">
		<div class="p-6 space-y-4" data-testid="entry-type-dialog">
			{#if allowed}
				<h2 class="h3">{m.ENTRY_TYPE_EDIT()}</h2>
				<p class="text-sm">
					<span class="text-surface-600-300-token">{m.ENTRY_TYPE_EDIT_CURRENT()}</span>
					<span class="font-semibold">{currentType.label}</span>
				</p>
				<div class="space-y-2">
					<span class="block">{m.ENTRY_TYPE_EDIT_NEW()}</span>
					<OfferedEffectorTypeSelect bind:selectedEffectorType={selected} />
				</div>
				{#if removedTags.length}
					<div class="alert variant-soft-warning" data-testid="entry-type-removed-tags">
						<div class="alert-message">
							<p>{m.ENTRY_TYPE_EDIT_TAGS_REMOVED()}</p>
							<ul class="list-disc pl-5">
								{#each removedTags as tag (tag.uid)}<li>{tag.label ?? tag.uid}</li>{/each}
							</ul>
						</div>
					</div>
				{/if}
				<p class="text-sm text-surface-600-300-token">{m.ENTRY_TYPE_EDIT_SLUG_NOTE()}</p>
				{#if refusal}
					<p class="text-sm text-error-700-200-token" data-testid="entry-type-refusal">
						{refusal.text}
						{#if refusal.slug}<a class="anchor" href="{base}/e/{refusal.slug}">{m.ENTRY_TYPE_EDIT_SEE_DUPLICATE()}</a>{/if}
					</p>
				{/if}
				<div class="flex flex-wrap items-center justify-end gap-2">
					{#if saved}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
						<span>{m.ENTRY_TYPE_EDIT_SAVED()}</span>
					{/if}
					<button type="button" class="btn min-h-11 variant-ghost-surface" onclick={() => dialog?.close()} disabled={busy}>
						{m.CANCEL()}
					</button>
					<button
						type="button"
						class="btn min-h-11 variant-filled-primary"
						disabled={!canSave}
						onclick={save}
						data-testid="entry-type-save"
					>
						{m.ENTRY_TYPE_EDIT_SAVE()}
					</button>
				</div>
			{:else if permission}
				<h2 class="h3">{m.ENTRY_TYPE_EDIT_LOCKED()}</h2>
				<p data-testid="entry-type-locked-reason">{lockedExplanation(permission)}</p>
				<p>{m.ENTRY_TYPE_EDIT_ALTERNATIVE()}</p>
				{#if facilityUid && effectorUid}
					<a
						class="btn min-h-11 variant-filled-primary"
						href={recreateEntryHref(base, facilityUid, effectorUid)}
						data-testid="entry-type-recreate"
					>
						<span><Fa icon={faPlus} /></span>
						<span>{m.ENTRY_TYPE_EDIT_RECREATE()}</span>
					</a>
				{/if}
				{#if active}
					<p>{m.ENTRY_TYPE_EDIT_DEACTIVATE()}</p>
					<EntryToggleActive {active} />
				{/if}
				<div class="flex justify-end">
					<button type="button" class="btn min-h-11 variant-ghost-surface" onclick={() => dialog?.close()}>
						{m.CLOSE()}
					</button>
				</div>
			{/if}
		</div>
	</Dialog>
{/if}
