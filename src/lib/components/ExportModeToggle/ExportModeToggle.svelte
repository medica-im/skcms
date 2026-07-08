<script lang="ts">
	import { SlideToggle } from '@skeletonlabs/skeleton';
	import * as m from '$msgs';

	let {
		checked = $bindable(false),
		onchange
	}: {
		checked?: boolean;
		onchange?: () => void;
	} = $props();
</script>

<div class="flex items-center gap-3 variant-ringed-surface rounded-token px-4 py-2">
	<SlideToggle
		name="export-mode"
		bind:checked
		on:change={onchange}
		background="bg-surface-300 dark:bg-surface-600"
		active="bg-primary-500"
	>
		{m.USERS_EXPORT_LISTMONK_TOGGLE()}
	</SlideToggle>
</div>
