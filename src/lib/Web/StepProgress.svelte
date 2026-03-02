<script lang="ts">
	import { faCheck } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { fade } from 'svelte/transition';

	let {
		steps
	}: {
		steps: { label: string; completed: boolean }[];
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
<div class="sticky top-0 z-10 self-start bg-surface-100-800-token py-3 px-4 shadow-sm opacity-90 w-fit" transition:fade={{ duration: 300 }}>
	<div class="flex items-center">
		{#each steps as step, i}
			{#if i > 0}
				<div
					class="w-8 h-0.5 mx-1 transition-colors duration-300 {steps[i - 1].completed
						? 'bg-success-500'
						: 'bg-surface-300 dark:bg-surface-600'}"
				></div>
			{/if}
			<div class="flex flex-col items-center gap-1">
				<div
					class="w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300
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
