<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { language } from '$lib/store/languageStore';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import LegalNotices from '$lib/LegalNotices/LegalNotices.svelte';
</script>

<svelte:head>
	<title>
		{capitalizeFirstLetter(m.LEGAL_NOTICES(), $language)} - {capitalizeFirstLetter(
			page.data.organization.formatted_name,
			$language
		)}
	</title>
</svelte:head>

<div class="bg-surface-100-800-token programs-gradient">
	<LegalNotices />
</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-7xl p-4 py-8 md:py-12;
	}
	/* Programs Gradient */
	/* prettier-ignore */
	.programs-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 100% 0%,  rgba(var(--color-primary-500) / 0.33) 0px, transparent 50%);
	}
</style>
