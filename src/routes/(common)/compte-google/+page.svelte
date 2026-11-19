<script lang="ts">
	import { variables } from '$src/lib/utils/constants';
	import { page } from '$app/state';
	import { base } from '#lib/utils/base.ts';
	import { capitalizeFirstLetter } from '#lib/helpers/stringHelpers.ts';
	import GoogleAccountHelp from '#lib/Auth/GoogleAccountHelp.svelte';
</script>

<svelte:head>
	<title>
		Se connecter avec Google - {capitalizeFirstLetter(
			page.data.organization.formatted_name,
			variables.DEFAULT_LANGUAGE
		)}
	</title>
	<link rel="canonical" href="{base()}/compte-google" />
</svelte:head>

<GoogleAccountHelp />
