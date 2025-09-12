<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faInfo } from '@fortawesome/free-solid-svg-icons';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Languages from './Languages.svelte';
	import { getEffectorUid, getEditMode } from '$lib/components/Directory/context';
	import Create from '$lib/Web/RPPS/Create.svelte';
	import Patch from '$lib/Web/RPPS/Patch.svelte';
	import Delete from '$lib/Web/RPPS/Delete.svelte';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let { data }: { data: EntryFull } = $props();

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
{#if data.spoken_languages && data?.spoken_languages.length}
	<div class="flex p-1">
		<div class="w-9"></div>
		<div>
			<Languages data={data.spoken_languages} />
		</div>
	</div>
{/if}
{#if data.effector_type.labels.includes('RPPS') && (data.rpps || $editMode)}
	<div class="flex p-1 space-x-4">
		<div class="w-9"></div>
		<div>
			N° RPPS: {data.rpps || '∅'}
		</div>
		{#if $editMode && data.rpps == null}
			<Create/>
			{:else if $editMode && data.rpps !== null}
				<Patch {data}/><Delete {data}/>
		{/if}
	</div>
{/if}
