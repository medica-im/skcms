<script lang="ts">
	import { getEditMode } from '#lib/components/Directory/context.ts';

	import * as m from "$msgs";	import { capitalizeFirstLetter } from '#lib/helpers/stringHelpers.ts';
	
	import Fa from 'svelte-fa';
	import { faAddressBook, faEnvelope } from '@fortawesome/free-regular-svg-icons';
	import { faGlobe, faBlog } from '@fortawesome/free-solid-svg-icons';
    import Website from '#lib/Website/Website.svelte';
    import type { Website as WebsiteType } from '#lib/interfaces/website.interface.ts';

	let { data } : { data: WebsiteType[]} = $props();
    let editMode = getEditMode();
</script>
<div class="">
{#each data as website (website.id)}
<Website data={website} editMode={$editMode}/>
{/each}
</div>
