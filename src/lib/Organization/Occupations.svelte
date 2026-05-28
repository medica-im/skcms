<script lang="ts">
import { page } from "$app/state";
	export let data: any;
	const dirPath = page.data.directory.setting.path || '/';
	const typeSlug = page.data.directory.setting.type_slug;

	function getHref(value: any[]): string {
		const typesParam = `types=${encodeURIComponent(JSON.stringify([value[0].effector_type.uid]))}`;
		if (typeSlug) {
			return `${dirPath}/${value[0].effector_type.slug}?${typesParam}`;
		}
		return `${dirPath}?${typesParam}`;
	}
</script>

<div class="space-x-2">
	{#each [...data] as [key, value]}
		<a
			href={getHref(value)}
			class="btn variant-ghost-primary btn-sm m-2"
			><span class="">
				{value.length}
				{key}
			</span></a
		>
	{/each}
</div>
