<script lang="ts">
	import { faCheck } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { fade } from 'svelte/transition';

	let {
		steps,
		compact = false
	}: {
		steps: { label: string; completed: boolean }[];
		compact?: boolean;
	} = $props();

	const activeIndex = $derived(steps.findIndex((s) => !s.completed));
	const allCompleted = $derived(steps.every((s) => s.completed));
	let visible = $state(true);

	$effect(() => {
		if (allCompleted) {
			const timeout = setTimeout(() => {
				visible = false;
			}, 2000);
			return () => clearTimeout(timeout);
		} else {
			visible = true;
		}
	});
</script>

{#if visible}
<!--
	Centred, and narrower on a phone: with 32px connectors and 16px insets the
	four steps of the entry form were wider than a 375px screen's content.
-->
<div class="sticky top-0 z-10 self-center bg-surface-100-800-token {compact ? 'py-2 px-3' : 'py-3 px-2 sm:px-4'} shadow-sm opacity-90 w-fit" transition:fade={{ duration: 300 }}>
	<div class="flex items-center">
		{#each steps as step, i}
			{#if i > 0}
				<div
					class="{compact ? 'w-5 mx-1' : 'w-4 mx-0.5 sm:w-8 sm:mx-1'} h-0.5 transition-colors duration-300 {steps[i - 1].completed
						? 'bg-success-500'
						: 'bg-surface-300 dark:bg-surface-600'}"
				></div>
			{/if}
			<div class="flex flex-col items-center gap-1">
				<div
					class="{compact ? 'w-6 h-6 text-xs' : 'w-8 h-8'} rounded-full flex items-center justify-center font-bold transition-all duration-300
						{step.completed
						? 'variant-filled-success'
						: i === activeIndex
							? 'variant-filled-primary'
							: 'variant-filled-surface'}"
				>
					{#if step.completed}
						<Fa icon={faCheck} size="sm" />
					{:else}
						{i + 1}
					{/if}
				</div>
				<span
					class="text-xs font-medium whitespace-nowrap transition-colors duration-300
						{step.completed
						? 'text-success-700 dark:text-success-400'
						: i === activeIndex
							? 'text-primary-700 dark:text-primary-400'
							: 'text-surface-400 dark:text-surface-500'}"
				>
					{step.label}
				</span>
			</div>
		{/each}
	</div>
</div>
{/if}
