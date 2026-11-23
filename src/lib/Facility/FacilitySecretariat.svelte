<script lang="ts">
	import { page } from '$app/state';
	import { entrySlugPageUrl } from '#lib/utils/utils.ts';
	import Phones from '#lib/Directory/Phone/Phones.svelte';
	import ScheduleCards from '#lib/Schedule/ScheduleCards.svelte';
	import type { ApiSchedule } from '#lib/Schedule/scheduleApi.ts';
	import type { Entry } from '#lib/store/directoryStoreInterface.ts';

	let { entry, schedules }: { entry: Entry; schedules: ApiSchedule[] } = $props();

	const zone = $derived(
		page.data?.organization?.contact?.address?.public_holidays_zone ?? 'metropole'
	);
</script>

<section class="card p-4 space-y-4 w-full max-w-5xl" data-testid="facility-secretariat">
	<h2 class="h3">
		<a class="anchor" href={entrySlugPageUrl(entry)}>Secrétariat</a>
	</h2>
	{#if entry.phones?.length}
		<Phones data={entry.phones} />
	{/if}
	{#if schedules.length}
		<ScheduleCards {schedules} {zone} />
	{/if}
</section>
