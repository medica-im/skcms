<script lang="ts">
	let { dialog = $bindable(), classProp = "size-fit" } : { dialog: HTMLDialogElement|undefined; classProp?: string; } = $props();
</script>
<dialog class="size-fit" bind:this={dialog}>
	<slot/>
</dialog>