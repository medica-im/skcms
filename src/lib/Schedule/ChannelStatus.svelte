<script lang="ts">
	import { dateTime } from '#lib/store/dateTimeStore.ts';
	import { holidaysFor, timeZoneOf } from './holidays.ts';
	import { isOpen, type OpeningSchedule } from './openingHours.ts';

	/** One word, open or closed, said from the hours it is given. */
	let {
		opening,
		zone,
		open,
		closed
	}: { opening: OpeningSchedule; zone: string; open: string; closed: string } = $props();
</script>

<span class="inline-flex items-baseline" data-testid="channel-status">
	{#await holidaysFor(zone)}
		<span class="invisible" aria-hidden="true">{closed.length > open.length ? closed : open}</span>
	{:then holidays}
		{isOpen(opening, $dateTime, holidays, timeZoneOf(zone)) ? open : closed}
	{/await}
</span>
