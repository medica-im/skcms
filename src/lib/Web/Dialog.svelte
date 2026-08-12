<script lang="ts">
	let { dialog = $bindable(), classProp = "max-w-full sm:max-w-[90vw] lg:max-w-5xl", overflow = "overflow-visible", maxHeight = "max-h-[90dvh]" } : { dialog: HTMLDialogElement|undefined; classProp?: string; overflow?: string; maxHeight?: string; } = $props();
</script>

<!--
	max-h + overflow-y-auto so a form taller than the screen can be scrolled to
	its submit and cancel buttons instead of running off the bottom. Callers can
	still override `overflow` (a map or a dropdown may need to escape the box),
	but the height cap stays: without it the actions are unreachable on a phone.

	`maxHeight` is overridable for a dialog whose content has a fixed working
	area it should not give up — the avatar cropper keeps its 450px canvas, so
	it asks for more of the screen rather than a smaller area to crop in.
-->
<dialog
	class="rounded-lg {maxHeight} overflow-y-auto overscroll-contain {overflow} {classProp}"
	bind:this={dialog}
>
	<slot/>
</dialog>

<style>
	dialog {
		background-color: rgb(var(--color-surface-100));
		color: rgb(var(--color-surface-900));
	}
	:global(.dark) dialog {
		background-color: rgb(var(--color-surface-800));
		color: rgb(var(--color-surface-100));
	}

	/*
		Dim the page behind the modal.

		::backdrop rather than a covering <div>: it is the mechanism a native
		<dialog> already provides, it lives in the top layer so it covers fixed
		elements like the app bar without any z-index arithmetic, and it needs no
		extra DOM. (Skeleton's own Modal paints a wrapper div instead, but only
		because it is not a native dialog — copying that here would add markup to
		re-solve a problem the platform solves.)

		The browser default is very nearly transparent, which is why nothing was
		dimmed: in dark mode the dialog's surface and the app bar behind it are
		both surface tones, so the modal read as one more panel of the page.

		0.6 sits in the usual 50-70% range for a scrim; the blur is what does the
		remaining work in dark mode, where dimming alone still leaves two similar
		tones adjacent. Backdrop opacity is deliberately the same in both themes:
		a lighter scrim in light mode would dim less exactly where the contrast
		between dialog and page is already weakest.
	*/
	dialog::backdrop {
		background-color: rgb(0 0 0 / 0.6);
		backdrop-filter: blur(2px);
	}
</style>