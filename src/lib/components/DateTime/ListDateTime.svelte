<script lang="ts">
	/**
	 * A date in an ordered list, relative while recent and absolute after
	 * (formatListDateTime), with the exact moment as its tooltip. The same in
	 * every list, so scanning one reads like scanning any other.
	 */
	import { getLocale } from '../../../paraglide/runtime.js';
	import { formatFullDateTime, formatListDateTime } from '$lib/utils/dateTimeFormat';
	import { toTime, type DateTimeValue } from '$lib/utils/dateTimeSort';

	let { value }: { value: DateTimeValue } = $props();

	const time = $derived(toTime(value));
	const locale = $derived(getLocale());
</script>

{#if time === null}
	<span>—</span>
{:else}
	<time datetime={new Date(time).toISOString()} title={formatFullDateTime(time, locale)}>
		{formatListDateTime(time, { locale })}
	</time>
{/if}
