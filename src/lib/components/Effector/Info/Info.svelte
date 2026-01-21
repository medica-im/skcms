<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faInfo } from '@fortawesome/free-solid-svg-icons';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Languages from './Languages.svelte';
	import { getEditMode } from '$lib/components/Directory/context';
	import RPPSCreate from '$lib/Web/RPPS/Create.svelte';
	import RPPSPatch from '$lib/Web/RPPS/Patch.svelte';
	import RPPSDelete from '$lib/Web/RPPS/Delete.svelte';
	import LanguagesPatch from '$lib/Web/Languages/Patch.svelte';
	import LanguagesDelete from '$lib/Web/Languages/Delete.svelte';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let { data }: { data: EntryFull } = $props();

	let spokenLanguages = $derived(data.spoken_languages);

	const editMode = getEditMode();
</script>

<div class="flex items-center p-1">
	<div class="w-9"><Fa icon={faInfo} /></div>
	<div>
		<h3 class="h3">
			{capitalizeFirstLetter(m.ADDRESSBOOK_INFORMATIONS())}
		</h3>
	</div>
</div>
{#if data.effector_type.labels.includes('HCW') && (spokenLanguages || $editMode)}
	<div class="flex p-1">
		<div class="w-9"></div>
		<div class="flex gap-4">
			<Languages data={spokenLanguages} />
			{#if $editMode}
			<LanguagesPatch data={spokenLanguages}/>
			{#if spokenLanguages !== null}
			<LanguagesDelete data={spokenLanguages}/>
			{/if}
			{/if}
		</div>
	</div>
{/if}
{#if data.effector_type.labels.includes('RPPS') && (data.rpps || $editMode)}
	<div class="flex p-1">
		<div class="w-9"></div>
		<div class="flex gap-4">
			N° RPPS: {data.rpps || '∅'}
		
		{#if $editMode && data.rpps == null}
			<RPPSCreate/>
			{:else if $editMode && data.rpps !== null}
				<RPPSPatch {data}/><RPPSDelete {data}/>
		{/if}
		</div>
	</div>
{/if}
