<script lang="ts">
	let { dialog = $bindable(), classProp = "max-w-full sm:max-w-[90vw] lg:max-w-5xl" } : { dialog: HTMLDialogElement|undefined; classProp?: string; } = $props();
</script>
<dialog class="rounded-lg overflow-visible {classProp}" bind:this={dialog}>
	<slot/>
</dialog>