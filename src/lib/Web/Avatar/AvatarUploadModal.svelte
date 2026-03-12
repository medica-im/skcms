<script lang="ts">
	import { invalidate } from '$app/navigation';
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
		entryUid,
		hasAvatar = false
	}: { entryUid: string; hasAvatar: boolean } = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();
	let imageSrc: string | undefined = $state();
	let cropper: any = $state();
	let cropperContainer: HTMLDivElement | undefined = $state();
	let uploading = $state(false);
	let deleting = $state(false);
	let result: { success: boolean; message?: string } | undefined = $state();

	const MAX_UPLOAD_SIZE = 1024;
	const MIN_DIMENSION = 500;

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
				<cropper-selection initial-coverage="0.8" movable resizable aspect-ratio="1">
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
				width: MAX_UPLOAD_SIZE,
				height: MAX_UPLOAD_SIZE
			});

			// Validate minimum size
			if (canvas.width < MIN_DIMENSION || canvas.height < MIN_DIMENSION) {
				result = {
					success: false,
					message: `L'image doit faire au moins ${MIN_DIMENSION}x${MIN_DIMENSION} pixels`
				};
				uploading = false;
				return;
			}

			const blob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85);
			});

			if (!blob) {
				result = { success: false, message: 'Erreur lors du traitement de l\'image' };
				uploading = false;
				return;
			}

			const formData = new FormData();
			formData.append('file', blob, `avatar-${entryUid}.jpg`);

			const response = await fetch(`/api/avatar/${entryUid}`, {
				method: 'PUT',
				body: formData
			});

			if (response.ok) {
				result = { success: true };
				invalidate('entry:now');
				invalidate('app:entries');
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

	async function deleteAvatar() {
		deleting = true;
		result = undefined;

		try {
			const response = await fetch(`/api/avatar/${entryUid}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				result = { success: true };
				invalidate('entry:now');
				invalidate('app:entries');
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
		if (fileInput) fileInput.value = '';
	}
</script>

<button
	onclick={() => {
		cleanup();
		dialog?.showModal();
	}}
	class="btn btn-sm variant-ghost-surface"
	title={hasAvatar ? m.AVATAR_CHANGE() : m.AVATAR_UPLOAD()}
>
	<span>{hasAvatar ? m.AVATAR_CHANGE() : m.AVATAR_UPLOAD()}</span>
	<span><Fa icon={hasAvatar ? faPenToSquare : faCamera} /></span>
</button>

<Dialog bind:dialog>
	<div class="p-4 space-y-4 w-full min-w-[360px] flex flex-col items-center">
		<h3 class="h3 mb-4">{m.AVATAR_CROP_TITLE()}</h3>
		{#if !imageSrc}
		<div class="card variant-ghost p-4 w-72">
<p>Pour assurer la cohésion d'ensemble, pour une personne physique, nous recommandons une photo de style identité, dans un cadre professionnel ou neutre, centrée sur le visage, de face, avec un espace minimum au-dessus de la tête, incluant les épaules de face et avec un peu d'espace en-dessous du col.</p></div>
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
						<span>{m.AVATAR_UPLOAD_SUCCESS()}</span>
					{:else}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span>{result.message}</span>
					{/if}
				{/if}
				{#if imageSrc && !result?.success}
					<button
						onclick={uploadCropped}
						class="variant-filled-secondary btn"
						disabled={uploading}
					>
						{#if uploading}
							{m.AVATAR_UPLOADING()}
						{:else}
							{m.AVATAR_UPLOAD_BTN()}
						{/if}
					</button>
				{/if}
				{#if hasAvatar && !result?.success}
					<button
						onclick={deleteAvatar}
						class="variant-filled-warning btn"
						disabled={deleting}
					>
						<Fa icon={faTrash} class="mr-1" />
						{m.AVATAR_DELETE()}
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