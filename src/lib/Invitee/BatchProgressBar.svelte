<script lang="ts" module>
	export type BatchPhase = 'creating' | 'sending';

	export interface BatchProgress {
		phase: BatchPhase;
		total_rows: number;
		processed_rows: number;
		emails_total: number;
		emails_processed: number;
		percentage: number;
	}
</script>

<script lang="ts">
	import * as m from '$msgs';

	let { progress }: { progress: BatchProgress } = $props();

	const sending = $derived(progress.phase === 'sending');
	const done = $derived(sending ? progress.emails_processed : progress.processed_rows);
	const total = $derived(sending ? progress.emails_total : progress.total_rows);
</script>

<div>
	<div class="flex justify-between text-sm mb-1">
		<span>{sending ? m.BATCH_INVITEE_PHASE_SENDING() : m.BATCH_INVITEE_PHASE_CREATING()}</span>
		<span data-testid="batch-progress-count">{done} / {total} ({progress.percentage}%)</span>
	</div>
	<div
		class="w-full bg-surface-300 rounded-full h-4"
		role="progressbar"
		aria-valuemin="0"
		aria-valuemax="100"
		aria-valuenow={progress.percentage}
	>
		<div
			class="bg-primary-500 h-4 rounded-full transition-all duration-300"
			style="width: {progress.percentage}%"
		></div>
	</div>
</div>
