<script lang="ts">
	import { onMount } from 'svelte';
	import { Calendar } from '@fullcalendar/core';
	import dayGridPlugin from '@fullcalendar/daygrid';
	import googleCalendarPlugin from '@fullcalendar/google-calendar';
	import { getLocale } from '$prgld/runtime.js';

	let {
		calendarId,
		apiKey,
		locale = getLocale()
	}: {
		calendarId: string;
		apiKey: string;
		locale?: string;
	} = $props();

	let calendarEl: HTMLDivElement;
	let calendar: Calendar;
	let status: 'loading' | 'ok' | 'error' = $state('loading');
	let errorMessage: string = $state('');

	onMount(() => {
		calendar = new Calendar(calendarEl, {
			plugins: [dayGridPlugin, googleCalendarPlugin],
			googleCalendarApiKey: apiKey,
			events: {
				googleCalendarId: calendarId,
				failure: (error) => {
					status = 'error';
					errorMessage = error.message || 'Unknown error';
					console.error('[GoogleCalendar] Event source failure:', error);
				},
				success: () => {
					status = 'ok';
				}
			},
			locale,
			headerToolbar: {
				left: 'prev,next today',
				center: 'title',
				right: ''
			}
		});
		calendar.render();

		return () => {
			calendar.destroy();
		};
	});
</script>

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
<div bind:this={calendarEl} class="w-full"></div>

<style>
	:global(.fc-event-title) {
		white-space: normal !important;
		overflow-wrap: break-word;
	}
</style>
