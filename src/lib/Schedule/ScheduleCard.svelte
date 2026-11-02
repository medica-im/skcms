
<script lang="ts">
	import Fa from 'svelte-fa';
	import { faPen } from '@fortawesome/free-solid-svg-icons';
	import { dateTime } from '$lib/store/dateTimeStore.ts';
	import { holidaysFor, timeZoneOf } from './holidays.ts';
	import { isOpen, isoDayAt, nextChange, summarize } from './openingHours.ts';
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
</script>

<div class="card p-4 space-y-2" data-testid="schedule-card">
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
		<h5 class="h5">{schedule.label || CHANNELS[schedule.channel]}</h5>
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
		{#if editable}
			<button
				type="button"
				class="btn-icon variant-ghost-surface ml-auto min-h-[44px] min-w-[44px]"
				title="Modifier les horaires"
				onclick={onedit}><Fa icon={faPen} /></button
			>
		{/if}
	</div>
	{#if groups.length}
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
	<p class="opacity-80">
		{schedule.holidays === 'closed' ? 'Fermé les jours fériés.' : 'Ouvert les jours fériés.'}
	</p>
</div>
