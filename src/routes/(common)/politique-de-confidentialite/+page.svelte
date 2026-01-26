<script lang="ts">
	import { variables } from '$src/lib/utils/constants';
	import { page } from '$app/state';
	import * as m from "$msgs";
	
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Fa from 'svelte-fa';
	import { faCheck } from '@fortawesome/free-solid-svg-icons';
</script>

<svelte:head>
	<title>
		{capitalizeFirstLetter(
			m.PRIVACY_POLICY(),
			variables.DEFAULT_LANGUAGE
		)} - {capitalizeFirstLetter(page.data.organization.formatted_name, variables.DEFAULT_LANGUAGE)}
	</title>
</svelte:head>

<h2 class="h2">{capitalizeFirstLetter(
	m.PRIVACY_POLICY(),
	variables.DEFAULT_LANGUAGE
)}</h2>