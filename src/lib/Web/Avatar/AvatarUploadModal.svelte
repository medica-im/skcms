<script lang="ts">
	import { invalidate } from '$app/navigation';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { avatarAccessOptions, DEFAULT_AVATAR_ACCESS } from './avatarAccess';
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
		hasAvatar = false,
		access = DEFAULT_AVATAR_ACCESS
	}: { entryUid: string; hasAvatar: boolean; access?: string } = $props();

	// Minimum role required to see the picture (see avatarAccess.ts).
	let selectedAccess = $state(access);
	let savingAccess = $state(false);
	const selectedAccessDescription = $derived(
		avatarAccessOptions.find((o) => o.value === selectedAccess)?.description ?? ''
	);

	let dialog: HTMLDialogElement | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();
	let imageSrc: string | undefined = $state();
	let cropper: any = $state();
	let cropperContainer: HTMLDivElement | undefined = $state();
	let uploading = $state(false);
	let cropping = $state(false);
	let deleting = $state(false);
	let result: { success: boolean; message?: string } | undefined = $state();

	/**
	 * The cropped image, held for review before anything is uploaded.
	 *
	 * Cropping is blind: the selection is drawn over the whole photograph, but
	 * what gets stored is a small round rendition of the selected region, and a
	 * crop that looked right can still cut the chin. Keeping the result here —
	 * a data URL to show, and the blob that will actually be sent — lets the
	 * user see it first, and go back to the cropper with the original
	 * photograph still loaded if it does not suit.
	 */
	let croppedPreview: { url: string; blob: Blob } | undefined = $state();

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
		// A new photograph invalidates any crop already under review.
		croppedPreview = undefined;
		const reader = new FileReader();
		reader.onload = (e) => {
			imageSrc = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	/** Tallest the cropper may get, so its buttons stay on a 720px-high laptop. */
	const MAX_CANVAS_HEIGHT = 450;

	async function initCropper(img: HTMLImageElement) {
		cropper?.destroy();
		const { default: Cropper } = await import('cropperjs');

		// The canvas takes the photograph's own shape, rather than a fixed 450px
		// height that every picture is letterboxed into.
		//
		// Letterboxing is what made the crop escapable: the image occupied part of
		// the canvas and the selection was free to roam the empty bands above and
		// below it, so it had to be policed back in by hand. With the canvas the
		// same shape as the picture, the picture fills it — "inside the canvas"
		// and "inside the photograph" become the same thing, and cropper.js's own
		// bounds do the work that constrainSelectionToImage was doing badly.
		//
		// It is also what broke portraits. `initial-coverage` is a fraction of the
		// canvas, so for a tall photograph 0.8 of a 512-wide canvas is a square
		// wider than the picture — a selection that cannot be dragged anywhere or
		// resized, because it is already outside its own bounds.
		const ratio = img.naturalWidth / img.naturalHeight || 1;
		const width = cropperContainer?.clientWidth || 512;
		const height = Math.min(Math.round(width / ratio), MAX_CANVAS_HEIGHT);
		// A portrait taller than the cap would otherwise overflow it: give back
		// the width instead, so the picture still fills the canvas exactly.
		const canvasWidth = Math.min(width, Math.round(height * ratio));

		cropper = new Cropper(img, {
			container: cropperContainer,
			template: `<cropper-canvas background style="width:${canvasWidth}px;height:${height}px;margin:0 auto;">
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

		constrainSelectionToImage();
	}

	/**
	 * Keeps the crop inside the photograph.
	 *
	 * The selection is otherwise free to wander over the whole canvas, and where
	 * it leaves the picture there is nothing to export: the stored avatar comes
	 * back with a black margin down one side, or a black corner. Nothing signals
	 * it while cropping, so it is discovered only once the picture is saved.
	 *
	 * cropper.js v2 has no "contain" option, but its `change` event is
	 * cancelable — returning false from the listener rejects the new geometry
	 * (see $change in cropperjs/dist/cropper.js). Rejecting outright would make
	 * the selection stick as soon as it touched an edge, so the proposed
	 * rectangle is clamped back inside the image and re-applied instead: the
	 * crop slides along the edge rather than stopping dead.
	 */
	function constrainSelectionToImage() {
		const selection = cropper?.getCropperSelection();
		const image = cropper?.getCropperImage();
		if (!selection || !image) return;

		/** Set while this listener is re-applying its own clamped geometry. */
		let reentrant = false;

		selection.addEventListener('change', (event: any) => {
			const { x, y, width, height } = event.detail ?? {};
			if ([x, y, width, height].some((v) => typeof v !== 'number')) return;

			// The image's own box, in the same coordinate space as the selection.
			const canvas = cropper?.getCropperCanvas();
			if (!canvas) return;
			const canvasRect = canvas.getBoundingClientRect();
			const imageRect = image.getBoundingClientRect();
			const left = imageRect.left - canvasRect.left;
			const top = imageRect.top - canvasRect.top;
			const right = left + imageRect.width;
			const bottom = top + imageRect.height;

			// A selection larger than the picture cannot be contained at all;
			// shrink it to fit rather than leaving it half outside.
			const maxWidth = Math.min(width, imageRect.width);
			const maxHeight = Math.min(height, imageRect.height);
			// aspect-ratio="1" is on the selection, so keep it square.
			const side = Math.min(maxWidth, maxHeight);

			const clampedX = Math.min(Math.max(x, left), right - side);
			const clampedY = Math.min(Math.max(y, top), bottom - side);

			if (clampedX === x && clampedY === y && side === width && side === height) {
				return;
			}

			// Reject the out-of-bounds geometry and apply the clamped one instead.
			//
			// The `change` event is cropper.js v2's only extension point for this:
			// there is no containment option on the selection or the canvas
			// (checked against cropperjs 2.1.0's own source), and the library's
			// examples constrain the crop exactly this way.
			//
			// `reentrant` is what makes it safe. $change re-emits this event, so
			// the call below re-enters the listener; without the guard that is an
			// infinite loop, and deferring it instead (queueMicrotask) escapes the
			// guard and loops just the same. The second pass is already inside the
			// image, so it clamps to itself and returns at the equality check above
			// — but only if it is allowed to run at all.
			event.preventDefault();
			if (reentrant) return;
			reentrant = true;
			try {
				selection.$change(clampedX, clampedY, side, side);
			} finally {
				reentrant = false;
			}
		});
	}

	/**
	 * Renders the current selection and shows it for review.
	 *
	 * Deliberately uploads nothing: this is the whole point of the step. The
	 * blob produced here is the one that will be sent if the user accepts it,
	 * so what they review is exactly what gets stored — recomputing it at
	 * upload time from a selection they never saw would defeat the review.
	 */
	async function applyCrop() {
		const selection = cropper?.getCropperSelection();
		if (!selection) return;

		cropping = true;
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
				return;
			}

			const blob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85);
			});

			if (!blob) {
				result = { success: false, message: "Erreur lors du traitement de l'image" };
				return;
			}

			croppedPreview = { url: canvas.toDataURL('image/jpeg', 0.85), blob };
			// The cropper is torn down so the dialog shows one image, not the
			// live cropper beside a frozen copy of its own output. imageSrc is
			// kept, which is what lets "adjust" rebuild it on the same
			// photograph instead of sending the user back to the file picker.
			cropper?.destroy();
			cropper = undefined;
		} catch (err) {
			result = { success: false, message: "Erreur lors du traitement de l'image" };
		} finally {
			cropping = false;
		}
	}

	/** Returns to the cropper, keeping the photograph already chosen. */
	function adjustCrop() {
		croppedPreview = undefined;
		result = undefined;
	}

	async function uploadCropped() {
		const blob = croppedPreview?.blob;
		if (!blob) return;

		uploading = true;
		result = undefined;

		try {
			const formData = new FormData();
			formData.append('file', blob, `avatar-${entryUid}.jpg`);
			formData.append('access', selectedAccess);

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

	async function saveAccess() {
		savingAccess = true;
		result = undefined;

		try {
			const response = await fetch(`/api/avatar/${entryUid}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ access: selectedAccess })
			});

			if (response.ok) {
				result = { success: true, message: m.AVATAR_ACCESS_SAVED() };
				invalidate('entry:now');
				invalidate('app:entries');
			} else {
				result = { success: false, message: `Erreur ${response.status}` };
			}
		} catch (err) {
			result = { success: false, message: 'Erreur réseau' };
		} finally {
			savingAccess = false;
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
				result = { success: true, message: m.AVATAR_DELETE_SUCCESS() };
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
		croppedPreview = undefined;
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

<!-- Taller than the 90dvh default: the cropper keeps a fixed 450px canvas, and
     at 90dvh the buttons below it fell ~50px past the bottom of a 720px window.
     Shrinking the canvas instead would make the crop harder to place, which is
     the one thing this dialog exists to do. -->
<Dialog bind:dialog maxHeight="max-h-[96dvh]">
	<div class="p-4 space-y-3 w-full min-w-[360px] flex flex-col items-center">
		<!-- No mb-4 on top of space-y: the gap is already there, and the doubled
		     margin pushed the buttons off a short window. -->
		<h3 class="h3">{m.AVATAR_CROP_TITLE()}</h3>
		{#if !imageSrc}
		<div class="card variant-ghost p-4 w-72">
<p>Pour assurer la cohésion d'ensemble, pour une personne physique, nous recommandons une photo de style identité, dans un cadre professionnel ou neutre, centrée sur le visage, de face, avec un espace minimum au-dessus de la tête, incluant les épaules de face et avec un peu d'espace en-dessous du col.</p></div>
{/if}
		<div class="space-y-4">
			<!-- File input. Hidden once a photograph is chosen, so the cropper
			     keeps its full 450px on a short window instead of sharing the
			     height with a control that has done its job. `hidden` rather
			     than an {#if}: the element stays in the DOM, which is what lets
			     "adjust the crop" return to the same photograph rather than an
			     emptied picker. -->
			<label class="label max-w-sm" class:hidden={imageSrc}>
				<span>{m.AVATAR_SELECT_FILE()}</span>
				<input
					bind:this={fileInput}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onchange={onFileSelected}
					class="input p-2"
				/>
			</label>

			<!-- Avatar access level. Out of the way while the cropper is up: it
			     is decided just before sending, not while placing the crop, and
			     those ~90px are what pushed the crop button off a 720px window.
			     Kept in the DOM for the same reason as the file input above. -->
			<label class="label max-w-sm" class:hidden={imageSrc && !croppedPreview}>
				<span>{m.AVATAR_ACCESS_LABEL()}</span>
				<!-- Inert once the picture is sent: the only remaining button is
				     "Fermer", so a change here could not be saved. Leaving it
				     editable invited a choice that was silently discarded. -->
				<select
					class="select"
					name="avatar-access"
					aria-label={m.AVATAR_ACCESS_LABEL()}
					disabled={result?.success}
					bind:value={selectedAccess}
				>
					{#each avatarAccessOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<span class="text-sm text-surface-500">{selectedAccessDescription}</span>
			</label>

			<!-- Cropper area. Hidden while a crop is under review, so the dialog
			     never shows the live cropper beside a frozen copy of its output. -->
			{#if imageSrc && !croppedPreview}
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

			<!-- The crop, as it will be stored: one square image, the shape the
			     picture is actually saved in. -->
			{#if croppedPreview}
				<div class="flex flex-col items-center gap-3">
					<p class="text-sm text-surface-500">{m.AVATAR_PREVIEW_HINT()}</p>
					<!-- rounded-none, not rounded-token: the token follows the theme,
					 and a theme with a large base radius turns a square element
					 into a circle — which is the shape the avatar is *displayed*
					 in, not the shape it is stored in. This preview exists to
					 show the crop that will be saved, so it stays square. -->
					<img
						data-testid="avatar-crop-preview"
						src={croppedPreview.url}
						alt={m.AVATAR_PREVIEW_ALT()}
						class="w-48 h-48 object-cover rounded-none border border-surface-300-600-token"
					/>
				</div>
			{/if}

			<!-- Removing the picture is not one of the dialog's normal actions:
			     it undoes what the rest of it exists to do. Its own row, behind
			     a rule, so it is nowhere near the confirming button. -->
			{#if hasAvatar && !result?.success}
				<div class="w-full">
					<hr class="!border-t-1 my-3" />
					<button
						onclick={deleteAvatar}
						class="variant-filled-warning btn btn-sm"
						disabled={deleting}
					>
						<Fa icon={faTrash} class="mr-1" />
						{m.AVATAR_DELETE()}
					</button>
					<hr class="!border-t-1 my-3" />
				</div>
			{/if}

			<!-- Actions. Confirming action first, cancel last (variant-filled-error),
			     which is the order every other form in the project uses — see
			     Association/CreateOfficer.svelte. Cancel becomes Close on success. -->
			<div class="flex items-center gap-2 flex-wrap justify-between w-full">
				{#if result}
					{#if result.success}
						<!-- The message the action set, not a fixed one: deleting a
						     picture and saving a visibility change both reported
						     "Photo mise à jour", which is wrong for each. -->
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
						<span>{result.message ?? m.AVATAR_UPLOAD_SUCCESS()}</span>
					{:else}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span>{result.message}</span>
					{/if}
				{/if}
				{#if imageSrc && !croppedPreview && !result?.success}
					<!-- Crop, then review. Nothing is uploaded from here. -->
					<button onclick={applyCrop} class="variant-filled-secondary btn" disabled={cropping}>
						{m.AVATAR_CROP_BTN()}
					</button>
				{:else if croppedPreview && !result?.success}
					<button onclick={adjustCrop} class="variant-ghost-surface btn" disabled={uploading}>
						{m.AVATAR_CROP_ADJUST()}
					</button>
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
				{:else if hasAvatar && !result?.success}
					<!-- Existing avatar: allow changing only its visibility -->
					<button
						onclick={saveAccess}
						class="variant-filled-secondary btn"
						disabled={savingAccess || selectedAccess === access}
					>
						{m.CONFIRM()}
					</button>
				{/if}
				<!-- The colour follows what the button does, not where it sits.
				     Cancelling abandons work in progress, so it warns; closing
				     after a successful upload merely acknowledges a result that
				     went well, and red there reads as though something failed. -->
				<button
					type="button"
					class="btn ml-auto {result?.success
						? 'variant-ghost-surface'
						: 'variant-filled-error'}"
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