<script lang="ts">
	/**
	 * The order of a sortable list on smaller screens, where its column headers
	 * (SortHeader) are hidden: one option per column and direction, so it can
	 * set everything the headers can. The page owns the state, gives the
	 * current `value`, and applies the `onchange`d one -- the same state the
	 * headers use, so the two never disagree. Option labels come from the
	 * page: French agrees them with the list ("récentes" invitations,
	 * "récents" users).
	 */
	import * as m from '$msgs';

	let {
		value,
		options,
		onchange
	}: {
		value: string;
		options: { value: string; label: string }[];
		onchange: (value: string) => void;
	} = $props();
</script>

<label class="label flex items-center gap-2 mb-3 lg:hidden">
	<span class="font-semibold">{m.SORT_LABEL()}</span>
	<select class="select w-auto min-h-11" {value} onchange={(e) => onchange(e.currentTarget.value)}>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</label>
