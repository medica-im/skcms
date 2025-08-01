<script lang="ts">
    	import type { PageProps } from './$types';
    let { data, form }: PageProps = $props();
</script>

<div class="container p-8 gap-8 space-y-8">
<h1 class="h1">Monkeys</h1>

<div class="card p-4">
    <ul>
    {#each data.monkeys as monkey}
    <li>🐵 {monkey.name}</li>
    {/each}
    </ul>
</div>

<div class="rounded-lg p-4 variant-ghost-secondary gap-2 items-center place-items-center w-72">
    {#if form && form?.success && form?.data}
    <p>A new monkey named {form.data.name} was added!</p>
    {:else if form && !(form?.success)}
    <p>There was an error.</p>
    {/if}
	<form method="POST">
		<label class="label">
			Monkey name
			<input class="input" name="name" type="text" />
		</label>
		<button type="submit" class="btn variant-filled">Send</button>
	</form>
</div>
</div>