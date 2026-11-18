
<script lang="ts">
	import Fa from 'svelte-fa';
	import { faPen, faClock } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import { dateTime } from '#lib/store/dateTimeStore.ts';
	import { holidaysFor, timeZoneOf } from './holidays.ts';
	import { isOpen, isoDayAt, isRoundTheClock, nextChange, summarize } from './openingHours.ts';
	import { toOpeningSchedule, type ApiSchedule } from './scheduleApi.ts';
	import { describeChange, formatDays, formatPeriods } from './scheduleText.ts';

	const CHANNELS = {
		on_site: 'Sur place',
		phone: 'Par téléphone',
		sms: 'Par SMS',
		online: 'En ligne'
	};

	let {
		schedule,
		zone,
		editable = false,
		onedit
	}: { schedule: ApiSchedule; zone: string; editable?: boolean; onedit?: () => void } = $props();

	const opening = $derived(toOpeningSchedule(schedule));
	const timeZone = $derived(timeZoneOf(zone));
	const groups = $derived(summarize(opening));
	const today = $derived(isoDayAt($dateTime, timeZone));
	// Never closed: one line says it, where seven identical days and an « Ouvert » that is always
	// true would tell it badly.
	const roundTheClock = $derived(isRoundTheClock(opening));
</script>

<div class="card p-4 space-y-2" data-testid="schedule-card">
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
		<h5 class="h5">{schedule.label || CHANNELS[schedule.channel]}</h5>
		{#if roundTheClock}
			<span
				class="rounded-full px-3 py-1 text-lg font-bold variant-filled-success inline-flex items-center gap-2"
				data-testid="schedule-round-the-clock"><Fa icon={faClock} />{m.SCHEDULE_ROUND_THE_CLOCK()}</span
			>
			<span>{m.SCHEDULE_HOLIDAYS_INCLUDED()}</span>
		{:else}
		{#await holidaysFor(zone) then holidays}
			{@const open = isOpen(opening, $dateTime, holidays, timeZone)}
			{@const change = describeChange(nextChange(opening, $dateTime, holidays, timeZone))}
			<span
				class="rounded-full px-3 py-1 font-semibold {open
					? 'variant-filled-success'
					: 'variant-filled-surface'}"
				data-testid="schedule-status">{open ? 'Ouvert' : 'Fermé'}</span
			>
			{#if change}<span>{change}</span>{/if}
		{/await}
		{/if}
		{#if editable}
			<button
				type="button"
				class="btn-icon variant-ghost-surface ml-auto min-h-[44px] min-w-[44px]"
				title="Modifier les horaires"
				onclick={onedit}><Fa icon={faPen} /></button
			>
		{/if}
	</div>
	{#if roundTheClock}
		<!-- said above -->
	{:else if groups.length}
		<ul class="space-y-1">
			{#each groups as group (group.from)}
				<li class={group.from <= today && today <= group.to ? 'font-bold' : ''}>
					{formatDays(group.from, group.to)} : {formatPeriods(group.periods)}
				</li>
			{/each}
		</ul>
	{:else}
		<p>Fermé toute la semaine.</p>
	{/if}
	{#if !roundTheClock}
		<p class="opacity-80">
			{schedule.holidays === 'closed' ? 'Fermé les jours fériés.' : 'Ouvert les jours fériés.'}
		</p>
	{/if}
</div>
