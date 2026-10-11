<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
	import Dialog from '$lib/Web/Dialog.svelte';

	let {
		dialog = $bindable(),
		onusegeocoder,
		onsaveanyway
	}: {
		dialog: HTMLDialogElement | undefined;
		onusegeocoder: () => void;
		onsaveanyway: () => void;
	} = $props();
</script>

<Dialog bind:dialog classProp="w-[90vw] sm:w-[32rem]">
	<div class="space-y-4 p-4" data-testid="missing-gps-dialog">
		<h3 class="h3 flex items-center gap-2">
			<span class="text-warning-500"><Fa icon={faTriangleExclamation} /></span>
			{m.FACILITY_GPS_DIALOG_TITLE()}
		</h3>
		<p>{m.FACILITY_GPS_DIALOG_TEXT()}</p>
		<div class="flex flex-wrap justify-end gap-2">
			<button
				type="button"
				class="variant-ghost-surface btn"
				onclick={() => {
					dialog?.close();
					onsaveanyway();
				}}>{m.FACILITY_GPS_DIALOG_SAVE_ANYWAY()}</button
			>
			<button
				type="button"
				class="variant-filled-primary btn"
				onclick={() => {
					dialog?.close();
					onusegeocoder();
				}}>{m.FACILITY_GPS_DIALOG_USE_GEOCODER()}</button
			>
		</div>
	</div>
</Dialog>
