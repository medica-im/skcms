<script lang="ts">
	import Fa from 'svelte-fa';
	import { faMapLocationDot, faAddressBook } from '@fortawesome/free-solid-svg-icons';
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';

	let { data = $bindable(), onToggle }: { data: boolean; onToggle: (value: boolean) => void } = $props();
</script>

<RadioGroup padding="p-2" active="variant-filled-primary" hover="hover:variant-soft-primary">
	<RadioItem bind:group={data} name="justify" value={false} on:change={() => onToggle(false)}
		><div class="flex 2xl:items-center 2xl:space-x-1">
			<Fa icon={faAddressBook} /><span class="hidden 2xl:inline-block">Annuaire</span>
		</div></RadioItem
	>
	<RadioItem bind:group={data} name="justify" value={true} on:change={() => onToggle(true)}
		><div class="flex 2xl:items-center 2xl:space-x-1">
			<Fa icon={faMapLocationDot} /><span class="hidden 2xl:inline-block">Carte</span>
		</div></RadioItem
	>
</RadioGroup>
