<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faEuroSign } from '@fortawesome/free-solid-svg-icons';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import CarteVitale from './CarteVitale.svelte';
	import ThirdPartyPayer from './ThirdPartyPayer.svelte';
	import Convention from './Convention.svelte';
	import { getEditMode } from '$lib/components/Directory/context';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';
	let { data }: { data: EntryFull } = $props();

	const editMode = getEditMode();
</script>

<div class="flex items-center p-1">
	<div class="w-9"><Fa icon={faEuroSign} size="sm" /></div>
	<div>
		<h3 class="h3">
			{m.ADDRESSBOOK_COSTS_AND_REIMBURSEMENTS()}
		</h3>
	</div>
</div>
{#if data?.convention != null || $editMode}
	<Convention data={data.convention} editMode={$editMode} />
{/if}
{#if data?.carte_vitale != null || $editMode}
	<CarteVitale data={data.carte_vitale} editMode={$editMode} />
{/if}
{#if data.third_party_payers != null || $editMode}
	<ThirdPartyPayer data={data?.third_party_payers} editMode={$editMode} />
{/if}