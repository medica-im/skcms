<script lang="ts">
	import Fa from 'svelte-fa';
	import { faClock } from '@fortawesome/free-regular-svg-icons';
	import { faPlus } from '@fortawesome/free-solid-svg-icons';
	import { page } from '$app/state';
	import { getEditMode } from '$lib/components/Directory/context.ts';
	import ScheduleCard from './ScheduleCard.svelte';
	import ScheduleEditor from './ScheduleEditor.svelte';
	import type { ApiSchedule } from './scheduleApi.ts';

	let { data, entryUid }: { data: ApiSchedule[] | null; entryUid: string } = $props();

	const editMode = getEditMode();
	let editor: ScheduleEditor | undefined = $state();
	const zone = $derived(page.data?.organization?.contact?.address?.public_holidays_zone ?? 'metropole');
</script>

<div>
	<div class="flex items-center p-1">
		<div class="w-9"><Fa icon={faClock} size="sm" /></div>
		<h4 class="h4 flex place-items-center gap-1">
			Horaires{#if $editMode}<button
					type="button"
					class="btn-icon variant-ghost-surface min-h-[44px] min-w-[44px]"
					title="Ajouter des horaires"
					onclick={() => editor?.open()}><Fa icon={faPlus} /></button
				>{/if}
		</h4>
	</div>
	{#if data?.length}
		<div class="flex">
			<div class="w-9"></div>
			<div class="grid grid-cols-1 gap-2 py-2 w-full">
				{#each data as schedule (schedule.uid)}
					<ScheduleCard {schedule} {zone} editable={$editMode} onedit={() => editor?.open(schedule)} />
				{/each}
			</div>
		</div>
	{/if}
</div>
<ScheduleEditor bind:this={editor} {entryUid} />
