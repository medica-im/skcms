<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { language } from '$lib/store/languageStore';
	import Fa from 'svelte-fa';
	import { faGlobe, faBlog } from '@fortawesome/free-solid-svg-icons';
	import { getHostnameFromURL } from '$lib/utils/utils';

	export let website;
	
	
	function removeHttp(url: string) {
		return url.replace(/^https?:\/\//, '');
	}
</script>

<a
	href={website.url}
	title={removeHttp(website.url)}
	target="_blank"
	rel="external"
	class="btn variant-ghost-secondary"
>
	<span><Fa icon={faGlobe} /></span><span>{getHostnameFromURL(website.url)}</span>
</a>
