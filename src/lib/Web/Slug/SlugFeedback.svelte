<script lang="ts">
	import Fa from 'svelte-fa';
	import { faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import type { SlugView } from './slugView.ts';

	/** What a slug field says under its input: the check's result, the warning, the free slugs to pick. */
	let { view, onchoose }: { view: SlugView; onchoose: (suggestion: string) => void } = $props();

	const bad = $derived(view.status === 'taken' || view.status === 'invalid' || view.status === 'error');
</script>

<p
	class="flex items-center gap-2 {view.status === 'free' ? 'text-success-900-50-token' : ''} {bad ? 'text-error-700-200-token' : ''}"
	data-testid="slug-status"
	data-status={view.status}
	aria-live="polite"
>
	{#if view.status === 'free'}<Fa icon={faCheck} />{:else if bad}<Fa icon={faExclamationCircle} />{/if}
	{view.message}
</p>
{#if view.warning}
	<p class="variant-ringed-warning text-surface-900-50-token p-2 rounded-token" data-testid="slug-warning">{view.warning}</p>
{/if}
{#if view.suggestions.length}
	<div class="flex flex-wrap items-center gap-2" data-testid="slug-suggestions">
		<span>{m.SLUG_SUGGESTIONS()}</span>
		{#each view.suggestions as suggestion (suggestion)}
			<button type="button" class="btn variant-ringed-surface text-surface-900-50-token min-h-[44px]" onclick={() => onchoose(suggestion)}>{suggestion}</button>
		{/each}
	</div>
{/if}
