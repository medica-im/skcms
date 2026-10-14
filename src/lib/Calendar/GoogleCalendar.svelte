<script lang="ts">
	import googleCalendarPlugin from '@fullcalendar/google-calendar';
	import { getLocale } from '$prgld/runtime.js';
	import EventCalendar from './EventCalendar.svelte';
	import * as m from '$msgs';

	let {
		calendarId,
		apiKey,
		locale = getLocale(),
		view
	}: {
		calendarId: string;
		apiKey: string;
		locale?: string;
		view?: 'dayGridMonth' | 'listMonth';
	} = $props();

	let status: 'loading' | 'ok' | 'error' = $state('loading');
	let errorMessage: string = $state('');

	const events = {
		googleCalendarId: calendarId,
		failure: (error: { message?: string }) => {
			status = 'error';
			errorMessage = error.message || 'Unknown error';
			console.error('[GoogleCalendar] Event source failure:', error);
		},
		success: () => {
			status = 'ok';
		}
	};
</script>

<EventCalendar
	{events}
	options={{ plugins: [googleCalendarPlugin], googleCalendarApiKey: apiKey }}
	heading={m.CALENDAR()}
	{locale}
	{view}
>
	{#snippet footer()}
		{#if import.meta.env.DEV}
			<details class="p-2 text-sm text-surface-500">
				<summary class="cursor-pointer">Debug</summary>
				<div class="space-y-1 p-2 font-mono text-xs">
					<p>Calendar ID: <code>{calendarId}</code></p>
					<p>API Key: <code>{apiKey.slice(0, 8)}...{apiKey.slice(-4)}</code></p>
					<p>Status:
						{#if status === 'loading'}
							<span class="text-warning-500">loading...</span>
						{:else if status === 'ok'}
							<span class="text-success-500">connected</span>
						{:else}
							<span class="text-error-500">error: {errorMessage}</span>
						{/if}
					</p>
				</div>
			</details>
		{/if}
	{/snippet}
</EventCalendar>
