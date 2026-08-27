<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import type { Entry } from '$lib/store/directoryStoreInterface.js';
	import { buttonLabel, tooltipLabel } from '$lib/Organization/occupationLabel.js';

	let { data }: { data: Map<string, Entry[]> | [string, Entry[]][] } = $props();

	const dirPath = `${base}${page.data.directory.setting.path || '/'}`;
	const typeSlug = page.data.directory.setting.type_slug;

	function getHref(value: Entry[]): string {
		const typesParam = `types=${encodeURIComponent(JSON.stringify([value[0].effector_type.uid]))}`;
		if (typeSlug) {
			return `${dirPath}/${value[0].effector_type.slug}?${typesParam}`;
		}
		return `${dirPath}?${typesParam}`;
	}

	// The map key is already the properly flexed label (see genderedLabel), so
	// it is what the rule falls back to when no acronym is available.
	function displayLabel(key: string, value: Entry[]): string {
		const type = value[0]?.effector_type;
		return buttonLabel(key, type?.name, type?.raw_label);
	}

	function fullName(key: string, value: Entry[]): string {
		const type = value[0]?.effector_type;
		return tooltipLabel(key, type?.name, type?.raw_label);
	}
</script>

<div class="flex flex-wrap justify-center gap-4">
	{#each [...data] as [key, value]}
		<a
			href={getHref(value)}
			class="btn variant-ghost-primary btn-sm max-w-full whitespace-normal text-center"
			title={fullName(key, value)}
		>
			<span>
				{value.length}
				{displayLabel(key, value)}
			</span>
		</a>
	{/each}
</div>
