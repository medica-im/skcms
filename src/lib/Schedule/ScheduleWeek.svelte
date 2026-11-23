<script lang="ts">
	import type { IsoDay, OpeningSchedule } from './openingHours.ts';
	import { nowOffset, weekRows } from './weekRows.ts';
	import { formatDays, formatPeriods } from './scheduleText.ts';

	let {
		schedule,
		today,
		minutes,
		tone = 'primary',
		aligned = false
	}: {
		/** The days are rows of the card's grid, shared with the neighbouring cards (subgrid). */
		aligned?: boolean;
		schedule: OpeningSchedule;
		today: IsoDay;
		/** Minutes since midnight, in the place's time zone. */
		minutes: number;
		tone?: 'primary' | 'success';
	} = $props();

	const layout = $derived(weekRows(schedule));
	const now = $derived(layout ? nowOffset(layout, minutes) : null);
	const bar = $derived(tone === 'success' ? 'bg-success-500' : 'bg-primary-500');
</script>

{#if layout}
	<div
		class={aligned ? 'grid grid-rows-subgrid row-span-8 gap-y-1' : 'space-y-1'}
		data-testid="week-axis"
	>
		<div class="grid grid-cols-[6.5rem_1fr] items-end gap-x-2 px-2" aria-hidden="true">
			<span></span>
			<div class="relative h-6">
				{#each layout.ticks as hour, i (hour)}
					<span
						class="absolute -translate-x-1/2 text-base opacity-80 {i % 2 ? 'hidden sm:inline' : ''}"
						style="left: {((hour * 60 - layout.start) / (layout.end - layout.start)) * 100}%"
						>{hour}h</span
					>
				{/each}
			</div>
		</div>
		{#each layout.rows as row (row.isoDay)}
			<div
				data-testid="week-row-{row.isoDay}"
				aria-current={row.isoDay === today ? 'date' : undefined}
				class="grid grid-cols-[6.5rem_1fr] gap-x-2 rounded-container-token px-2 py-1 {row.isoDay === today
					? 'bg-surface-200-700-token font-bold'
					: ''}"
			>
				<span class="text-base">{formatDays(row.isoDay, row.isoDay)}</span>
				<div>
					<div class="relative h-5 rounded-full bg-surface-300-600-token opacity-90">
						{#each row.blocks as block (block.opens)}
							<span
								class="absolute inset-y-0 rounded-full {bar}"
								style="left: {block.left}%; width: {block.width}%"
							></span>
						{/each}
						{#if row.isoDay === today && now !== null}
							<span
								data-testid="week-now"
								aria-hidden="true"
								class="absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-surface-900-50-token"
								style="left: {now}%"
							></span>
						{/if}
					</div>
					<p class="text-base">
						{row.blocks.length ? formatPeriods(row.blocks, true) : 'Fermé'}
					</p>
				</div>
			</div>
		{/each}
	</div>
{/if}
