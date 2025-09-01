<script lang="ts">
	import * as m from "$msgs";
	import Fa from 'svelte-fa';
	import { faCreditCard } from '@fortawesome/free-regular-svg-icons';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Patch from '$lib/Web/Entry/Payment/Patch.svelte';
	import Delete from '$lib/Web/Entry/Payment/Delete.svelte';
	import type { PaymentMethod } from '$lib/interfaces/fullEffector.interface'
	
	let { data, editMode=false}: {data: PaymentMethod[]|null, editMode?: boolean} = $props();

</script>

<div class="flex items-center p-1">
	<div class="w-9"><Fa icon={faCreditCard} size="sm" /></div>
	<div>
		<h3 class="h3">
			{#if data && data.length > 1}
			{m.ADDRESSBOOK_PAYMENT_METHODS()}
			{:else}
			{m.ADDRESSBOOK_PAYMENT_METHOD()}
			{#if data == null}
				<Patch {data}/>
			{/if}
			{/if}
        </h3>
	</div>
</div>
{#if data}
<div class="flex p-1 space-x-4">
	<div class="w-9"></div>
	<div class="p-1">
		{#each data as method, i}
			{#if i == 0}{capitalizeFirstLetter(
					method.label_fr as string
				)}{:else}{' '}{method.label_fr}{/if}{#if i < data.length - 2},
			{:else if i == data.length - 2}{' '}{m.AND()}{:else}.{/if}
		{/each}
	</div>
	{#if editMode}
	<Patch {data}/><Delete {data}/>
	{/if}
</div>
{/if}
