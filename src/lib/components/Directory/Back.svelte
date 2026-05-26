<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Fa from 'svelte-fa';
	import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

	const searchParams = ['term', 'situation', 'facility', 'types', 'communes', 'department', 'address', 'tags'];

	const hasSearchParams: boolean = $derived(
		searchParams.some((param) => page.url.searchParams.has(param))
	);

	const label: string = $derived(
		hasSearchParams
			? capitalizeFirstLetter(m.ADDRESSBOOK_GOTOSEARCH())
			: capitalizeFirstLetter(m.NAVBAR_ADDRESSBOOK())
	);
</script>

<button onclick={() => history.back()} class="btn variant-ghost-primary">
	<span class="badge variant-filled-primary"><Fa icon={faArrowLeft} /></span>
	<span class="whitespace-normal text-left">{label}</span>
</button>
