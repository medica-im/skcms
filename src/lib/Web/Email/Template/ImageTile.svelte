<script lang="ts">
	import Fa from 'svelte-fa';
	import { faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';
	import ZoomableImage from '$lib/Image/ZoomableImage.svelte';
	import CopyButton from './CopyButton.svelte';
	import { formatBytes, imageErrorMessage, imgTag, mjImageTag, type EmailImage } from './emailTemplate';
	import { deleteEmailImage, updateEmailImage } from '../../../../emailTemplate.remote';

	/**
	 * One image of the gallery: what it is, how to put it in a template, and
	 * how to rename or delete it.
	 *
	 * The address copied is the absolute one, base path included: an email is
	 * read far from the site, and a relative address would lead nowhere.
	 * Renaming changes only the label here, never the file, so emails already
	 * sent keep working; deleting breaks them, which the confirmation says.
	 */
	let { image, canEdit }: { image: EmailImage; canEdit: boolean } = $props();

	let editDialog: HTMLDialogElement | undefined = $state();
	let deleteDialog: HTMLDialogElement | undefined = $state();
	let name = $state('');
	let alt = $state('');
	let busy = $state(false);
	let error = $state<string | undefined>();

	const hasChanges = $derived(name.trim() !== image.name || alt.trim() !== image.alt);

	function openEdit() {
		name = image.name;
		alt = image.alt;
		error = undefined;
		editDialog?.showModal();
	}

	async function saveEdit() {
		busy = true;
		error = undefined;
		const result = await updateEmailImage({ uid: image.uid, name: name.trim(), alt: alt.trim() });
		busy = false;
		if (result.success) {
			editDialog?.close();
		} else {
			error = imageErrorMessage(result.code);
		}
	}

	async function confirmDelete() {
		busy = true;
		error = undefined;
		const result = await deleteEmailImage(image.uid);
		busy = false;
		if (result.success) {
			deleteDialog?.close();
		} else {
			error = imageErrorMessage(result.code);
		}
	}
</script>

<li class="card flex flex-col overflow-hidden" data-testid="email-image">
	<div class="flex h-40 items-center justify-center bg-surface-200-700-token p-2">
		<ZoomableImage
			src={image.url}
			thumbnail={image.thumbnail_url}
			alt={image.alt || image.name}
			width={image.width}
			height={image.height}
			caption={image.name}
			class="max-h-full max-w-full object-contain"
		/>
	</div>
	<div class="flex flex-1 flex-col gap-3 p-4">
		<div>
			<p class="break-words font-semibold" data-testid="email-image-name">{image.name}</p>
			<p class="text-sm text-surface-600-300-token">
				{m.EMAIL_IMAGE_DIMENSIONS({ width: image.width, height: image.height, size: formatBytes(image.size) })}
			</p>
			<p class="break-all font-mono text-xs text-surface-600-300-token" data-testid="email-image-url">{image.url}</p>
		</div>
		<div class="flex flex-col gap-2">
			<CopyButton text={image.url} label={m.EMAIL_IMAGE_COPY_URL()} classes="btn variant-filled-primary" />
			<div class="flex flex-wrap gap-2">
				<CopyButton text={mjImageTag(image)} label={m.EMAIL_IMAGE_COPY_MJML()} classes="btn variant-soft-primary flex-1" />
				<CopyButton text={imgTag(image)} label={m.EMAIL_IMAGE_COPY_HTML()} classes="btn variant-soft-primary flex-1" />
			</div>
		</div>
		{#if canEdit}
			<div class="mt-auto flex justify-end gap-2">
				<button
					type="button"
					class="btn-icon min-h-11 min-w-11 variant-ghost-surface"
					onclick={openEdit}
					title={m.EMAIL_IMAGE_EDIT()}
					aria-label={m.EMAIL_IMAGE_EDIT()}
				>
					<Fa icon={faPenToSquare} />
				</button>
				<button
					type="button"
					class="btn-icon min-h-11 min-w-11 variant-ghost-error"
					onclick={() => {
						error = undefined;
						deleteDialog?.showModal();
					}}
					title={m.DELETE()}
					aria-label={m.DELETE()}
					data-testid="email-image-delete"
				>
					<Fa icon={faTrashCan} />
				</button>
			</div>
		{/if}
	</div>
</li>

<Dialog bind:dialog={editDialog} classProp="w-[90vw] sm:w-[28rem]">
	<div class="p-6 space-y-4">
		<h2 class="h3">{m.EMAIL_IMAGE_EDIT()}</h2>
		<label class="label">
			<span>{m.EMAIL_IMAGE_NAME()}</span>
			<input class="input" type="text" maxlength="200" bind:value={name} />
		</label>
		<label class="label">
			<span>{m.EMAIL_IMAGE_ALT()}</span>
			<span class="block text-sm text-surface-600-300-token">{m.EMAIL_IMAGE_ALT_HINT()}</span>
			<input class="input" type="text" maxlength="255" bind:value={alt} />
		</label>
		{#if error}
			<p class="text-sm text-error-700-200-token">{error}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<button type="button" class="btn min-h-11 variant-ghost-surface" onclick={() => editDialog?.close()} disabled={busy}>
				{m.CANCEL()}
			</button>
			<button
				type="button"
				class="btn min-h-11 variant-filled-primary"
				onclick={saveEdit}
				disabled={busy || !hasChanges || !name.trim()}
			>
				{m.EMAIL_IMAGE_SAVE()}
			</button>
		</div>
	</div>
</Dialog>

<Dialog bind:dialog={deleteDialog} classProp="w-[90vw] sm:w-[28rem]">
	<div class="p-6 space-y-4">
		<h2 class="h3">{m.EMAIL_IMAGE_DELETE_CONFIRM_TITLE()}</h2>
		<p class="font-semibold break-words">{image.name}</p>
		<p>{m.EMAIL_IMAGE_DELETE_CONFIRM_TEXT()}</p>
		{#if error}
			<p class="text-sm text-error-700-200-token">{error}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<button type="button" class="btn min-h-11 variant-ghost-surface" onclick={() => deleteDialog?.close()} disabled={busy}>
				{m.CANCEL()}
			</button>
			<button
				type="button"
				class="btn min-h-11 variant-filled-error"
				onclick={confirmDelete}
				disabled={busy}
				data-testid="email-image-delete-confirm"
			>
				{m.DELETE()}
			</button>
		</div>
	</div>
</Dialog>
