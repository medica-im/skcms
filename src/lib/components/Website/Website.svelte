<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { language } from '$lib/store/languageStore';
	import Fa from 'svelte-fa';
	import { faGlobe, faBlog } from '@fortawesome/free-solid-svg-icons';
	import { AppRailAnchor } from '@skeletonlabs/skeleton';
	import { getHostnameFromURL } from '$lib/utils/utils';
	import type { Website } from '$lib/interfaces/website.interface';

	let { website, appBar=false, appRail=false } : { website: Website; appBar?: boolean; appRail?: boolean } = $props();
	
	function removeHttp(url: string) {
		return url.replace(/^https?:\/\//, '');
	}
</script>
{#if appBar}
		<a
			href={website.url}
			title={website.url}
			class="btn-icon btn-icon-sm hover:variant-soft-secondary"
			target="_blank"
			rel="external"
		>
			<span><Fa icon={faGlobe} size="lg" /></span>
		</a>
{:else if appRail}
<AppRailAnchor
	href={website.url}
	rel="external"
	class="lg:hidden"
>
	<svelte:fragment slot="lead"><Fa icon={faGlobe} size="lg" class="inline-block outline-none" /></svelte:fragment>
	<span>{capitalizeFirstLetter(m.WEBSITE())}</span>
</AppRailAnchor>
{:else}
<a
	href={website.url}
	title={removeHttp(website.url)}
	target="_blank"
	rel="external"
	class="btn variant-ghost-secondary"
>
	<span><Fa icon={faGlobe} /></span><span>{getHostnameFromURL(website.url)}</span>
</a>
{/if}