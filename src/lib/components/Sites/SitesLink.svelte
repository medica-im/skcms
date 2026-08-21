<script lang="ts">
	import * as m from "$msgs";
	import Fa from 'svelte-fa';
	import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
	import { base } from '$app/paths';
</script>

<a href="{base}/sites" class="btn variant-filled w-fit">
		<span class="badge variant-filled-primary"> <Fa icon={faArrowRight} /></span>
		<span class="whitespace-normal text-left">
			{m.SITES_ALL()}
		</span>
</a>