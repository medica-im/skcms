<script>
	export let dialog
</script>
<dialog class="size-fit" bind:this={dialog} on:close>
	<slot/>
</dialog>