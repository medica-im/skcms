<script lang="ts">
    import EditPhone from './EditPhone.svelte';
    import type { Phone } from '$lib/interfaces/phone.interface.ts';
let { data }: { data: Phone[] } = $props();
</script>

{#each data as phone }
<div class="rounded-lg p-4 variant-ghost-secondary gap-2 items-center place-items-center">
<EditPhone data={phone}/>
</div>
{/each}