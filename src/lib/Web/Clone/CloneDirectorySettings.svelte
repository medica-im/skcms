<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { directoryDifferences, applyDirectorySettings } from '../../../clone.remote.ts';

	type Difference = {
		key: string;
		source: string[] | boolean | string;
		here: string[] | boolean | string;
		missing_here: string[];
		applied_by_default: boolean;
	};

	let { instance, token, directory }: { instance: string; token: string; directory: string } = $props();

	let differences = $state<Difference[] | null>(null);
	let chosen = $state<string[]>([]);
	let warnings = $state<string[]>([]);
	let applied = $state(false);
	let busy = $state(false);
	let failed = $state<number | null>(null);

	const LABELS: Record<string, () => string> = {
		lists_needs: m.CLONE_SETTING_LISTS_NEEDS,
		offered_types: m.CLONE_SETTING_OFFERED_TYPES,
		list_owner_entry: m.CLONE_SETTING_LIST_OWNER_ENTRY,
		minimum_role: m.CLONE_SETTING_MINIMUM_ROLE
	};

	const shown = (value: Difference['source']) =>
		Array.isArray(value)
			? value.join(', ') || m.CLONE_SETTING_EMPTY()
			: typeof value === 'boolean'
				? value ? m.YES() : m.NO()
				: value;

	async function load() {
		const res = await directoryDifferences({ instance, token, directory });
		if (!res.ok) {
			failed = res.status;
			return;
		}
		differences = res.differences;
		chosen = res.differences.filter((d: Difference) => d.applied_by_default).map((d: Difference) => d.key);
	}

	async function apply() {
		busy = true;
		failed = null;
		const res = await applyDirectorySettings({ instance, token, directory, keys: chosen });
		busy = false;
		if (!res.ok) {
			failed = res.status;
			return;
		}
		warnings = res.warnings;
		applied = true;
		await load();
	}

	onMount(load);
</script>

<div class="card variant-ghost p-4 space-y-3">
	<h3 class="h4">{m.CLONE_DIRECTORY_SETTINGS()}</h3>
	{#if failed !== null}
		<p class="text-error-500">{m.CLONE_DIRECTORY_SETTINGS_FAILED({ status: failed })}</p>
	{/if}
	{#if applied}
		<p class="text-success-600">{m.CLONE_DIRECTORY_SETTINGS_APPLIED()}</p>
	{/if}
	{#each warnings as w}<p class="opacity-75">ℹ {w}</p>{/each}
	{#if differences?.length === 0}
		<p class="opacity-75">{m.CLONE_DIRECTORY_SETTINGS_SAME()}</p>
	{:else if differences}
		<p class="opacity-75">{m.CLONE_DIRECTORY_SETTINGS_HINT()}</p>
		{#each differences as d (d.key)}
			<div class="space-y-1">
				<label class="flex items-center gap-3">
					<input class="checkbox" type="checkbox" value={d.key} bind:group={chosen} />
					<span class="font-semibold">{LABELS[d.key]?.() ?? d.key}</span>
				</label>
				<p class="pl-8">{m.CLONE_SETTING_SOURCE()} : <span>{shown(d.source)}</span></p>
				<p class="pl-8 opacity-75">{m.CLONE_SETTING_HERE()} : <span>{shown(d.here)}</span></p>
				{#if d.missing_here.length}
					<p class="pl-8 text-warning-600">{m.CLONE_SETTING_MISSING_HERE({ names: d.missing_here.join(', ') })}</p>
				{/if}
			</div>
		{/each}
		<button class="btn variant-filled-primary" disabled={busy || chosen.length === 0} onclick={apply}>
			{m.CLONE_DIRECTORY_SETTINGS_APPLY()}
		</button>
	{/if}
</div>
