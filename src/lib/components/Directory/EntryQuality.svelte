<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faClipboardCheck } from '@fortawesome/free-solid-svg-icons';
	import { bySeverity, qualityText, type QualityProblem } from '#lib/Web/Quality/quality.ts';

	/**
	 * What the entry is missing (backend directory/quality.py), for whoever may edit it. Warnings
	 * only: nothing here blocks an edit. What is missing comes first.
	 */
	let { problems }: { problems: QualityProblem[] } = $props();

	const groups = $derived(bySeverity(problems));
	const heading = (severity: string) => (severity === 'missing' ? m.QUALITY_MISSING() : m.QUALITY_INCOMPLETE());
</script>

{#if problems.length}
	<section
		aria-labelledby="entry-quality"
		class="variant-ringed-warning text-surface-900-50-token rounded-container-token p-4 space-y-2"
		data-testid="entry-quality"
	>
		<h4 class="h4 flex items-center gap-2" id="entry-quality">
			<Fa icon={faClipboardCheck} size="sm" />{m.QUALITY_TITLE()}
			<span class="badge variant-filled-warning text-base" data-testid="entry-quality-count">{problems.length}</span>
		</h4>
		{#each groups as group (group.severity)}
			<h5 class="h5 font-semibold">{heading(group.severity)}</h5>
			<ul class="list-disc pl-6 space-y-1 text-base">
				{#each group.items as problem (problem.code)}
					<li>{qualityText(problem.code)}</li>
				{/each}
			</ul>
		{/each}
	</section>
{/if}
