<script lang="ts">
	/**
	 * The button inside a sortable column's header cell: as wide as its label
	 * (a cell-wide button read as a stray bar on large screens), 44px tall.
	 * Put aria-sort (see ./sortHeader.ts) on the parent -- the <th>, or the
	 * role="columnheader" element of a grid.
	 *
	 * The icon is always drawn: a light grey faSort on a sortable column that
	 * is not the active one (darker on hover), and faSortUp / faSortDown in
	 * primary on the active one -- the icons the email page's table already
	 * used, so every sortable list in the app looks the same. Not hover-only:
	 * phones and tablets have no hover, and there nothing would say the column
	 * can be sorted.
	 */
	import Fa from 'svelte-fa';
	import { faSort, faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';
	import type { SortDirection } from './sortHeader';

	let {
		label,
		active,
		direction,
		onclick,
		disabled = false
	}: {
		label: string;
		active: boolean;
		direction: SortDirection;
		onclick: () => void;
		/** For a column that cannot order the rows shown: none of them has the value. */
		disabled?: boolean;
	} = $props();
</script>

<button
	type="button"
	class="group inline-flex min-h-11 items-center gap-2 rounded-token px-2 font-semibold
		{disabled ? 'opacity-50 cursor-not-allowed' : 'hover:variant-soft-surface'}
		{active && !disabled ? 'text-primary-700-200-token' : ''}"
	{disabled}
	{onclick}
>
	<span>{label}</span>
	<span
		data-testid="sort-icon"
		data-direction={active ? direction : 'none'}
		aria-hidden="true"
		class={active ? '' : 'opacity-40 group-hover:opacity-70'}
	>
		<Fa icon={!active ? faSort : direction === 'asc' ? faSortUp : faSortDown} />
	</span>
</button>
