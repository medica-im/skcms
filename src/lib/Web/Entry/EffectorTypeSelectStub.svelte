<script lang="ts">
	/**
	 * Test stand-in for EffectorTypeSelect, which loads the types from the
	 * backend on mount. Two buttons pick the entry's current type or another.
	 */
	let {
		selectedEffectorType = $bindable()
	}: { selectedEffectorType: { label: string; value: string } | undefined } = $props();
</script>

<button type="button" data-testid="stub-pick-current" onclick={() => (selectedEffectorType = { label: 'Infirmier', value: 't1' })}>
	current
</button>
<button type="button" data-testid="stub-pick-other" onclick={() => (selectedEffectorType = { label: 'IPA', value: 't2' })}>
	other
</button>
