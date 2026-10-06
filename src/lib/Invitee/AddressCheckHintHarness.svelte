<script lang="ts">
	/** An email field with its hint, as the invitation form uses them (test harness). */
	import AddressCheckHint from './AddressCheckHint.svelte';

	let { initial = '' }: { initial?: string } = $props();
	// svelte-ignore state_referenced_locally
	let email = $state(initial);
</script>

<label class="label">
	<span>Email</span>
	<input class="input" type="email" bind:value={email} />
</label>
<AddressCheckHint bind:email />
