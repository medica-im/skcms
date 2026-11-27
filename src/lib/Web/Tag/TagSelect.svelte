<script lang="ts">
	import Select from '#lib/Web/Select.svelte';
	import type { SelectType } from '#lib/interfaces/select.ts';

	let {
		label,
		items,
		value = $bindable(),
		onchange,
		onclear
	}: {
		label: string;
		items: SelectType[] | undefined;
		value?: SelectType[] | undefined;
		onchange?: (tags: SelectType[] | undefined) => void;
		onclear?: (cleared: SelectType | SelectType[] | undefined) => void;
	} = $props();
</script>

<label class="label">
	<span>{label}</span>
	<Select multiple {items} bind:value {onchange} {onclear} />
</label>
