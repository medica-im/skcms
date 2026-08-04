<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';
	import Fa from 'svelte-fa';
	import {
		faCamera,
		faPenToSquare,
		faCheck,
		faExclamationCircle,
		faTrash
	} from '@fortawesome/free-solid-svg-icons';

	let {
		facilityUid,
		hasImage = false,
		alt = ''
	}: { facilityUid: string; hasImage?: boolean; alt?: string } = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();
	let imageSrc: string | undefined = $state();
	let cropper: any = $state();
	let cropperContainer: HTMLDivElement | undefined = $state();
	let uploading = $state(false);
	let deleting = $state(false);
	let savingAlt = $state(false);
	let altText = $state(alt);
	let result: { success: boolean; message?: string } | undefined = $state();

	// A place is photographed wide: 1:1 would crop away the facade or the
	// entrance that makes the building recognizable. Must stay in step with
	// the place_sm / place_lg thumbnail aliases on the backend.
	const ASPECT_RATIO = 16 / 9;
	const OUTPUT_WIDTH = 1600;
	const OUTPUT_HEIGHT = 900;
	const MIN_WIDTH = 800;
	const MIN_HEIGHT = 450;

	const initialAlt = alt;
	const altChanged = $derived(altText !== initialAlt);

	function onFileSelected(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
			result = { success: false, message: 'Format non supporté (JPEG, PNG ou WebP)' };
			return;
		}

		result = undefined;
		const reader = new FileReader();
		reader.onload = (e) => {
			imageSrc = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	async function initCropper(img: HTMLImageElement) {
		cropper?.destroy();
		const { default: Cropper } = await import('cropperjs');
		cropper = new Cropper(img, {
			container: cropperContainer,
			template: `<cropper-canvas background style="width:100%;height:450px;">
				<cropper-image scalable translatable></cropper-image>
				<cropper-shade hidden></cropper-shade>
				<cropper-handle action="select" plain></cropper-handle>
				<cropper-selection initial-coverage="0.9" movable resizable aspect-ratio="${ASPECT_RATIO}">
					<cropper-grid role="grid" bordered covered></cropper-grid>
					<cropper-crosshair centered></cropper-crosshair>
					<cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>
					<cropper-handle action="n-resize"></cropper-handle>
					<cropper-handle action="e-resize"></cropper-handle>
					<cropper-handle action="s-resize"></cropper-handle>
					<cropper-handle action="w-resize"></cropper-handle>
					<cropper-handle action="ne-resize"></cropper-handle>
					<cropper-handle action="nw-resize"></cropper-handle>
					<cropper-handle action="se-resize"></cropper-handle>
					<cropper-handle action="sw-resize"></cropper-handle>
				</cropper-selection>
			</cropper-canvas>`
		});
	}

	async function uploadCropped() {
		const selection = cropper?.getCropperSelection();
		if (!selection) return;

		uploading = true;
		result = undefined;

		try {
			const canvas = await selection.$toCanvas({
				width: OUTPUT_WIDTH,
				height: OUTPUT_HEIGHT
			});

			if (canvas.width < MIN_WIDTH || canvas.height < MIN_HEIGHT) {
				result = {
					success: false,
					message: `L'image doit faire au moins ${MIN_WIDTH}x${MIN_HEIGHT} pixels`
				};
				uploading = false;
				return;
			}

			const blob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85);
			});

			if (!blob) {
				result = { success: false, message: "Erreur lors du traitement de l'image" };
				uploading = false;
				return;
			}

			const formData = new FormData();
			formData.append('file', blob, `place-${facilityUid}.jpg`);
			formData.append('alt', altText);

			const response = await fetch(`/api/facility/${facilityUid}/image`, {
				method: 'PUT',
				body: formData
			});

			if (response.ok) {
				result = { success: true, message: m.PLACE_IMAGE_UPLOAD_SUCCESS() };
				invalidateAll();
			} else {
				const data = await response.json().catch(() => ({}));
				result = {
					success: false,
					message: data.message || `Erreur ${response.status}`
				};
			}
		} catch (err) {
			result = { success: false, message: 'Erreur réseau' };
		} finally {
			uploading = false;
		}
	}

	/**
	 * Stores a new description without touching the picture itself.
	 *
	 * PATCH rather than the PUT used for uploads: there is no file to send, and
	 * PUT requires one.
	 */
	async function saveDescription() {
		savingAlt = true;
		result = undefined;

		try {
			const response = await fetch(`/api/facility/${facilityUid}/image`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ alt: altText })
			});

			if (response.ok) {
				result = { success: true, message: m.PLACE_IMAGE_UPLOAD_SUCCESS() };
				invalidateAll();
			} else {
				const data = await response.json().catch(() => ({}));
				result = { success: false, message: data.message || `Erreur ${response.status}` };
			}
		} catch (err) {
			result = { success: false, message: 'Erreur réseau' };
		} finally {
			savingAlt = false;
		}
	}

	async function deleteImage() {
		deleting = true;
		result = undefined;

		try {
			const response = await fetch(`/api/facility/${facilityUid}/image`, {
				method: 'DELETE'
			});

			if (response.ok) {
				result = { success: true, message: m.PLACE_IMAGE_DELETED() };
				invalidateAll();
			} else {
				result = { success: false, message: `Erreur ${response.status}` };
			}
		} catch (err) {
			result = { success: false, message: 'Erreur réseau' };
		} finally {
			deleting = false;
		}
	}

	function cleanup() {
		cropper?.destroy();
		cropper = undefined;
		imageSrc = undefined;
		result = undefined;
		altText = initialAlt;
		if (fileInput) fileInput.value = '';
	}
</script>

<button
	onclick={() => {
		cleanup();
		dialog?.showModal();
	}}
	class="btn btn-sm bg-surface-100-800-token text-surface-900-50-token variant-ringed-surface shadow opacity-90 hover:opacity-100 transition-opacity"
	title={hasImage ? m.PLACE_IMAGE_CHANGE() : m.PLACE_IMAGE_ADD()}
>
	<span>{hasImage ? m.PLACE_IMAGE_CHANGE() : m.PLACE_IMAGE_ADD()}</span>
	<span><Fa icon={hasImage ? faPenToSquare : faCamera} /></span>
</button>

<Dialog bind:dialog>
	<div class="p-4 space-y-4 w-full min-w-[360px] flex flex-col items-center">
		<h3 class="h3 mb-4">{m.PLACE_IMAGE_TITLE()}</h3>
		{#if !imageSrc}
			<div class="card variant-ghost p-4 w-72">
				<p>{m.PLACE_IMAGE_GUIDANCE()}</p>
			</div>
		{/if}
		<div class="space-y-4">
			<!-- File input -->
			<label class="label max-w-sm">
				<span>{m.AVATAR_SELECT_FILE()}</span>
				<input
					bind:this={fileInput}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onchange={onFileSelected}
					class="input p-2"
				/>
			</label>

			<!-- Alternative text, for people who cannot see the picture -->
			<label class="label max-w-sm">
				<span>{m.PLACE_IMAGE_ALT_LABEL()}</span>
				<input type="text" class="input p-2" bind:value={altText} maxlength="420" />
				<span class="text-sm text-surface-500">{m.PLACE_IMAGE_ALT_HELP()}</span>
			</label>

			<!-- Cropper area -->
			{#if imageSrc}
				<div
					bind:this={cropperContainer}
					class="relative min-w-[320px] lg:min-w-[512px] w-full h-full"
					style="height: 450px;"
				>
					<!-- svelte-ignore element_invalid_self_closing_tag -->
					<img
						src={imageSrc}
						alt="Preview"
						style="display:none;"
						onload={(e) => initCropper(e.currentTarget)}
					/>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex items-center gap-2 flex-wrap justify-between">
				{#if result}
					{#if result.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
						<span>{result.message}</span>
					{:else}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span>{result.message}</span>
					{/if}
				{/if}
				{#if imageSrc && !result?.success}
					<button onclick={uploadCropped} class="variant-filled-secondary btn" disabled={uploading}>
						{#if uploading}
							{m.AVATAR_UPLOADING()}
						{:else}
							{m.AVATAR_UPLOAD_BTN()}
						{/if}
					</button>
				{:else if hasImage && !result?.success}
					<!--
						The description can be corrected on its own, without hunting
						down the original file to upload again. Pictures moved over
						from the old storage all arrived without one, and a
						photograph nobody can see is useless to a visitor relying on
						a screen reader.

						Disabled until something actually changes, so an untouched
						dialog does not invite a pointless round trip.
					-->
					<button
						onclick={saveDescription}
						class="variant-filled-secondary btn"
						disabled={savingAlt || !altChanged}
					>
						{m.CONFIRM()}
					</button>
				{/if}
				{#if hasImage && !result?.success}
					<button onclick={deleteImage} class="variant-filled-warning btn" disabled={deleting}>
						<Fa icon={faTrash} class="mr-1" />
						{m.PLACE_IMAGE_DELETE()}
					</button>
				{/if}
				<button
					type="button"
					class="variant-filled-error btn ml-auto"
					onclick={() => {
						cleanup();
						dialog?.close();
					}}
				>
					{result?.success ? m.CLOSE() : m.CANCEL()}
				</button>
			</div>
		</div>
	</div>
</Dialog>
