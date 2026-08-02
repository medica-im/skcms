<script lang="ts">
	let { dialog = $bindable(), classProp = "max-w-full sm:max-w-[90vw] lg:max-w-5xl", overflow = "overflow-visible" } : { dialog: HTMLDialogElement|undefined; classProp?: string; overflow?: string; } = $props();
</script>

<!--
	max-h + overflow-y-auto so a form taller than the screen can be scrolled to
	its submit and cancel buttons instead of running off the bottom. Callers can
	still override `overflow` (a map or a dropdown may need to escape the box),
	but the height cap stays: without it the actions are unreachable on a phone.
-->
<dialog
	class="rounded-lg max-h-[90dvh] overflow-y-auto overscroll-contain {overflow} {classProp}"
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
</style>