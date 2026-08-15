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
<!--
	!m-auto is what centres these dialogs.

	A modal <dialog> is centred by the UA stylesheet: it gets `inset: 0` and
	`margin: auto`, and the auto margins share out the space left over. Tailwind's
	preflight resets `margin: 0` on every element, which removes that — the box
	then sits at the start of the inset area, measured here as
	`margin-left: 16px; margin-right: 0`.

	The `!` is not decoration. Setting `margin: auto` in this component's scoped
	<style> below does not work: the rule is in the cascade (verified) but
	preflight's reset lands after it, so the computed margin stays 16px/0. Only an
	important utility wins.

	Why it looked like only some dialogs were broken: a dialog that nearly fills
	the viewport has little room to be off-centre in, so create-phone — which asks
	for `w-[90vw] sm:w-[28rem]` — looked fine, while edit-phone and delete-phone,
	which set no width and shrink to their content, sat visibly against the edge
	at 16px left against 866px right. All of them were equally uncentred; only the
	narrow ones showed it. features/modal-centering.feature measures every dialog
	on an entry page rather than trusting the eye.
-->
<dialog
	class="rounded-lg !m-auto {maxHeight} overflow-y-auto overscroll-contain {overflow} {classProp}"
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