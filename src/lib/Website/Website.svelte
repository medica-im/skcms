<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { language } from '$lib/store/languageStore';
	import Fa from 'svelte-fa';
	import { faGlobe, faBlog } from '@fortawesome/free-solid-svg-icons';
	import Update from '$lib/Web/Website/Update.svelte';
	import Delete from '$lib/Web/Website/Delete.svelte';
	import type { Website as WebsiteType } from '$lib/interfaces/website.interface';

	let { data, editMode } : { data: WebsiteType; editMode: boolean } = $props();

	function removeHttp(url: string) {
		return url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
	}
</script>

<div class="flex content-start space-x-2 items-center">
	<div class="flex-initial break-words overflow-hidden">
		<div class="btn btn-sm !bg-transparent p-0 align-middle">
			<span class="w-4"><Fa icon={faGlobe} /></span>
			<span class="hidden 2xl:inline-block">{capitalizeFirstLetter(m.WEBSITE(), $language)}</span>
		</div>
	</div>
	<a
		class="unstyled underline underline-offset-4"
		href={data.url}
		title={removeHttp(data.url)}
		target="_blank"
		rel="external"
	>
		<div class="w-64 md:w-full flex-initial break-words overflow-hidden">
			{removeHttp(data.url)}
		</div>
	</a>
	{#if editMode}
    <Update {data}/> <Delete {data} />
	{/if}
</div>
