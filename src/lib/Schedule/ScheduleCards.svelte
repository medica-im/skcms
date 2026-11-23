<script lang="ts">
	import ScheduleCard from './ScheduleCard.svelte';
	import type { ApiSchedule } from './scheduleApi.ts';

	let { schedules, zone }: { schedules: ApiSchedule[]; zone: string } = $props();
</script>

<!--
	Two columns from xl up, each card spanning the same rows of the grid it sits in (subgrid): a
	weekday row is then as tall as the tallest of its neighbours, and « mercredi » reads straight
	across both plannings. Below xl the cards stack and the shared rows change nothing.
-->
<div class="grid grid-cols-1 gap-x-8 gap-y-6 xl:grid-cols-2">
	{#each schedules as schedule (schedule.uid)}
		<ScheduleCard {schedule} {zone} aligned />
	{/each}
</div>
