<script lang="ts">
	import googleCalendarPlugin from '@fullcalendar/google-calendar';
	import { getLocale } from '$prgld/runtime.js';
	import EventCalendar from './EventCalendar.svelte';
	import { googleCalendarLinks } from './googleCalendarLinks';
	import CopyButton from '$lib/Web/CopyButton.svelte';
	import Fa from 'svelte-fa';
	import { faCalendarPlus } from '@fortawesome/free-solid-svg-icons';
	import { faGoogle } from '@fortawesome/free-brands-svg-icons';
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

	const links = $derived(googleCalendarLinks(calendarId));

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
		<div class="border-t border-surface-400-500-token pt-3 space-y-2 text-center">
			<p class="font-medium">{m.CALENDAR_SUBSCRIBE()}</p>
			<div class="flex flex-wrap justify-center gap-2">
				<a href={links.google} target="_blank" rel="noreferrer" class="btn variant-soft-primary min-h-11">
					<span><Fa icon={faGoogle} /></span>
					<span>{m.CALENDAR_ADD_GOOGLE()}</span>
				</a>
				<a href={links.webcal} class="btn variant-soft-primary min-h-11">
					<span><Fa icon={faCalendarPlus} /></span>
					<span>{m.CALENDAR_ADD_WEBCAL()}</span>
				</a>
				<CopyButton text={links.ical} label={m.CALENDAR_COPY_ICAL()} />
			</div>
		</div>
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
