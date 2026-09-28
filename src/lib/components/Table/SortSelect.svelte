<script lang="ts">
	/**
	 * The order of a date-sorted list on smaller screens, where its column
	 * headers (SortHeader) are hidden. Bind `direction` to the same state as
	 * the header, so the two never disagree. The option labels come from the
	 * page: French agrees them with the list ("Plus récentes" invitations,
	 * "Plus récents" users).
	 */
	import * as m from '$msgs';
	import type { SortDirection } from './sortHeader';

	let {
		direction = $bindable(),
		newestLabel,
		oldestLabel
	}: { direction: SortDirection; newestLabel: string; oldestLabel: string } = $props();
</script>

<label class="label flex items-center gap-2 mb-3 lg:hidden">
	<span class="font-semibold">{m.SORT_LABEL()}</span>
	<select class="select w-auto min-h-11" bind:value={direction}>
		<option value="desc">{newestLabel}</option>
		<option value="asc">{oldestLabel}</option>
	</select>
</label>
