<script lang="ts">
	import { getEditMode } from '$lib/components/Directory/context';

	import * as m from "$msgs";	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	
	import Fa from 'svelte-fa';
	import { faAddressBook, faEnvelope } from '@fortawesome/free-regular-svg-icons';
	import { faGlobe, faBlog } from '@fortawesome/free-solid-svg-icons';
    import Website from '$lib/Website/Website.svelte';
    import type { Website as WebsiteType } from '$lib/interfaces/website.interface';

	let { data } : { data: WebsiteType[]} = $props();
    let editMode = getEditMode();
</script>
<div class="">
{#each data as website (website.id)}
<Website data={website} editMode={$editMode}/>
{/each}
</div>