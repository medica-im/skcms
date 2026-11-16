<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { qualityText, bySeverity } from '$lib/Web/Quality/quality.ts';

	let { data } = $props();
</script>

<svelte:head>
	<title>
		{m.QUALITY_REPORT_TITLE()} - {capitalizeFirstLetter(page.data.organization?.formatted_name ?? '')}
	</title>
</svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-6 p-4 py-4 md:py-8">
	<header class="space-y-2">
		<h1 class="h2">{m.QUALITY_REPORT_TITLE()}</h1>
		<p class="text-surface-600-300-token">{m.QUALITY_REPORT_INTRO()}</p>
	</header>

	{#if data.reports === null}
		<p class="text-error-700-200-token" data-testid="quality-load-failed">{m.QUALITY_REPORT_LOAD_FAILED()}</p>
	{:else}
		{#each data.reports as report (report.name)}
			<section class="space-y-4" aria-labelledby="quality-{report.name}">
				<h2 class="h3" id="quality-{report.name}">{report.label}</h2>
				{#if report.rules === null}
					<p class="text-error-700-200-token">{m.QUALITY_REPORT_LOAD_FAILED()}</p>
				{:else if report.rules.length === 0}
					<p class="text-surface-600-300-token">{m.QUALITY_REPORT_CLEAN()}</p>
				{:else}
					{#each bySeverity(report.rules) as group (group.severity)}
						<h3 class="h4">{group.severity === 'missing' ? m.QUALITY_MISSING() : m.QUALITY_INCOMPLETE()}</h3>
						<ul class="space-y-3">
							{#each group.items as rule (rule.code)}
								<li class="card variant-ringed-surface p-4 space-y-2" data-testid="quality-rule-{rule.code}">
									<p class="font-semibold text-surface-900-50-token">
										{qualityText(rule.code)}
										<span class="badge variant-filled-surface text-base ml-2">{m.QUALITY_REPORT_COUNT({ count: rule.entries.length })}</span>
									</p>
									<ul class="flex flex-wrap gap-2">
										{#each rule.entries as entry (entry.uid)}
											<li>
												<a
													class="btn variant-ringed-primary text-primary-800-100-token min-h-11"
													href="{base}/e/{entry.slug}"
												>
													{entry.label ?? entry.name}{#if entry.type}<span class="text-surface-600-300-token"> · {entry.type}</span>{/if}
												</a>
											</li>
										{/each}
									</ul>
								</li>
							{/each}
						</ul>
					{/each}
				{/if}
			</section>
		{/each}
	{/if}
</div>
