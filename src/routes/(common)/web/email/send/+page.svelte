<script lang="ts">
	import { page } from '$app/state';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { variables } from '$lib/utils/constants';
	import * as m from '$msgs';
	import BatchEmail from '$lib/Web/Email/BatchEmail.svelte';
</script>

<svelte:head>
	<title>{capitalizeFirstLetter(m.batch_email())} - {capitalizeFirstLetter(page.data.organization?.formatted_name_short ?? '', variables.DEFAULT_LANGUAGE)}</title>
</svelte:head>

<BatchEmail />
