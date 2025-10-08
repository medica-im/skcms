<script lang="ts">
	import { page } from '$app/state';
	import * as m from "$msgs";
	import type { Facility } from '$lib/interfaces/facility.interface';
	import Fa from 'svelte-fa';
	import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
	import { capitalizeFirstLetter } from "$lib/helpers/stringHelpers";
	export let data: Facility;

	const origin = `?origin=${encodeURIComponent(page.url.pathname)}`;
</script>

{#if data}
<a href="/sites/{data.slug||data.uid}{origin}" class="unstyled underline underline-offset-4 flex gap-2 items-center">
	<span>
		<Fa icon={faLocationDot}/>
	</span>
	<span>
		{data.label||data.name||capitalizeFirstLetter(m.FACILITY())}
	</span>
</a>
{/if}