<script lang="ts">
	import { page } from '$app/state';
	import Occupations from '$lib/Organization/Occupations.svelte';
	import Fa from 'svelte-fa';
	import { faAddressBook } from '@fortawesome/free-regular-svg-icons';
	import TeamCarousel from '$lib/Carousel/TeamCarousel.svelte';
	import * as m from '$msgs';
	export let data: any;

	const dirPath = page.data.directory.setting.path || "/";

	function displayTitle(): string|undefined {
		if ( page.data.organization.category.name == 'msp' ) {
			return m.HOME_TEAM_TITLE()
		} else if ( page.data.organization.category.name == 'cpts' )
		{
			return m.HOME_COMMUNITY_TITLE()
		}
	}
	function displayText(): string|undefined {
		if ( page.data.organization.category.name == 'msp' ) {
			return m.HOME_TEAM_TEXT()
		} else if ( page.data.organization.category.name == 'cpts' )
		{
			return m.HOME_COMMUNITY_TEXT()
		}
	}
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-10 items-center">
	{#if data.teamCarousel.length}
		<div class="place-items-center items-center justify-center content-center">
			<TeamCarousel data={data.teamCarousel} />
		</div>
	{/if}
	<div class="col-span-2 p-0 space-y-4 text-center self-center">
		<h2 class="h2">{displayTitle()}</h2>
		<p>{displayText()}</p>
		<div class="p-0 text-left">
			<Occupations data={data.cardinalTypes} />
		</div>
		<a href={dirPath} class="btn variant-ghost-surface" data-sveltekit-preload-data="hover">
			<span><Fa icon={faAddressBook} /></span><span>Annuaire</span>
		</a>
	</div>
</div>
