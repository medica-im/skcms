<script lang="ts">
	import { variables } from '$src/lib/utils/constants';
	import { page } from '$app/state';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import * as m from '$msgs';
	import GoogleCalendar from '$lib/Calendar/GoogleCalendar.svelte';
</script>

<svelte:head>
	<title>
		{m.CALENDAR()} - {capitalizeFirstLetter(page.data.organization.formatted_name, variables.DEFAULT_LANGUAGE)}
	</title>
</svelte:head>

<section class="bg-surface-100-800-token">
	<div class="section-container">
		{#if page.data.organization.google_calendar_id && page.data.organization.google_calendar_api_key}
			<GoogleCalendar
				calendarId={page.data.organization.google_calendar_id}
				apiKey={page.data.organization.google_calendar_api_key}
			/>
		{/if}
	</div>
</section>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-7xl p-4 py-8 md:py-12 space-y-6;
	}
</style>
