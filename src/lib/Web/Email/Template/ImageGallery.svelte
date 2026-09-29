<script lang="ts">
	import Fa from 'svelte-fa';
	import { faUpload, faCheck } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import ImageTile from './ImageTile.svelte';
	import { imageErrorMessage } from './emailTemplate';
	import { listEmailImages, uploadEmailImage } from '../../../../emailTemplate.remote';

	/**
	 * The organization's email images: add one, then copy its address into the
	 * template. Choosing a file sends it at once -- there is nothing else to
	 * fill in first; the name defaults to the file's, and both it and the
	 * description can be changed afterwards.
	 */
	// Seeing the images and copying their addresses is for every viewer;
	// adding, renaming and deleting only for whoever may change the emails.
	let { canEdit }: { canEdit: boolean } = $props();

	const images = $derived(await listEmailImages());

	const result = $derived(uploadEmailImage.result);
	const uploading = $derived(!!uploadEmailImage.pending);
</script>

<div class="space-y-4" data-testid="image-gallery">
	<p class="text-sm text-surface-600-300-token">{m.EMAIL_IMAGE_INTRO()}</p>

	{#if canEdit}
		<form
			{...uploadEmailImage.enhance(async (upload) => {
				try {
					await upload.submit();
				} finally {
					// Choosing the same file again must fire change again.
					upload.element.reset();
				}
			})}
			enctype="multipart/form-data"
			class="flex flex-wrap items-center gap-3"
		>
			<label class="btn min-h-11 variant-filled-primary cursor-pointer" class:opacity-50={uploading}>
				<span><Fa icon={faUpload} /></span>
				<span>{uploading ? m.EMAIL_IMAGE_UPLOADING() : m.EMAIL_IMAGE_ADD()}</span>
				<input
					type="file"
					name="file"
					class="sr-only"
					accept="image/png,image/jpeg,image/gif"
					disabled={uploading}
					onchange={(event) => event.currentTarget.form?.requestSubmit()}
					data-testid="email-image-upload"
				/>
			</label>
			<span class="text-sm text-surface-600-300-token">{m.EMAIL_IMAGE_FORMATS()}</span>
			{#if !uploading && result}
				{#if result.success}
					<span class="inline-flex items-center gap-2" data-testid="email-image-uploaded">
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
						<span>{m.EMAIL_IMAGE_UPLOADED()}</span>
					</span>
				{:else}
					<span class="badge variant-soft-error" data-testid="email-image-upload-error">
						{imageErrorMessage(result.code)}
					</span>
				{/if}
			{/if}
		</form>
	{/if}

	{#if images === null}
		<p class="text-error-700-200-token">{m.EMAIL_IMAGE_ERROR_UNKNOWN()}</p>
	{:else if images.length === 0}
		<p class="text-surface-600-300-token" data-testid="email-image-empty">{m.EMAIL_IMAGE_EMPTY()}</p>
	{:else}
		<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each images as image (image.uid)}
				<ImageTile {image} {canEdit} />
			{/each}
		</ul>
	{/if}
</div>
