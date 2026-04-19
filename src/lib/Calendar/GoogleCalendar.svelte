<script lang="ts">
	import { onMount } from 'svelte';
	import { Calendar } from '@fullcalendar/core';
	import dayGridPlugin from '@fullcalendar/daygrid';
	import listPlugin from '@fullcalendar/list';
	import googleCalendarPlugin from '@fullcalendar/google-calendar';
	import { getLocale } from '$prgld/runtime.js';
	import Dialog from '$lib/Web/Dialog.svelte';
	import Fa from 'svelte-fa';
	import { faMaximize, faMinimize } from '@fortawesome/free-solid-svg-icons';
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

	let innerWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);
	let effectiveView = $derived(
		view ?? (innerWidth < 768 ? 'listMonth' : 'dayGridMonth')
	);

	let calendarEl: HTMLDivElement;
	let calendar: Calendar;
	let status: 'loading' | 'ok' | 'error' = $state('loading');
	let errorMessage: string = $state('');

	let dialog: HTMLDialogElement | undefined = $state();
	let dialogOpen = $state(false);
	let fullscreenEl: HTMLDivElement | undefined = $state();

	function calendarConfig(initialView: 'dayGridMonth' | 'listMonth') {
		return {
			plugins: [dayGridPlugin, listPlugin, googleCalendarPlugin],
			initialView,
			googleCalendarApiKey: apiKey,
			events: {
				googleCalendarId: calendarId,
				failure: (error: { message?: string }) => {
					status = 'error';
					errorMessage = error.message || 'Unknown error';
					console.error('[GoogleCalendar] Event source failure:', error);
				},
				success: () => {
					status = 'ok';
				}
			},
			locale,
			contentHeight: 'auto' as const,
			buttonText: {
				today: m.CALENDAR_TODAY(),
				month: m.CALENDAR_MONTH(),
				list: m.CALENDAR_LIST()
			},
			headerToolbar: {
				left: 'prev,next today',
				center: 'title',
				right: 'dayGridMonth,listMonth'
			}
		};
	}

	onMount(() => {
		calendar = new Calendar(calendarEl, calendarConfig(effectiveView));
		calendar.render();
		return () => {
			calendar.destroy();
		};
	});

	$effect(() => {
		if (calendar) calendar.changeView(effectiveView);
	});

	$effect(() => {
		if (!dialogOpen || !fullscreenEl) return;
		const fsCal = new Calendar(fullscreenEl, calendarConfig(effectiveView));
		fsCal.render();
		return () => fsCal.destroy();
	});

	$effect(() => {
		if (!dialog) return;
		const handler = () => (dialogOpen = false);
		dialog.addEventListener('close', handler);
		return () => dialog?.removeEventListener('close', handler);
	});

	function openModal() {
		dialogOpen = true;
		dialog?.showModal();
	}

	function closeModal() {
		dialog?.close();
	}
</script>

<svelte:window bind:innerWidth />

<div class="card variant-ghost relative w-full lg:p-4 space-y-4">
	<button
		type="button"
		class="btn-icon btn-icon-sm variant-soft absolute top-2 right-2 z-10 md:hidden"
		onclick={openModal}
		aria-label={m.FULLSCREEN()}
	>
		<Fa icon={faMaximize} />
	</button>
	<button
		type="button"
		class="btn btn-sm variant-soft absolute top-2 right-2 z-10 hidden md:inline-flex"
		onclick={openModal}
	>
		<span>{m.FULLSCREEN()}</span>
		<Fa icon={faMaximize} />
	</button>
	<h2 class="h2 text-center">{m.CALENDAR()}</h2>
	<div bind:this={calendarEl} class="w-full"></div>
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
</div>

<Dialog bind:dialog classProp="w-[95vw] h-[95vh] max-w-none" overflow="overflow-auto">
	<div class="relative w-full h-full p-4">
		<button
			type="button"
			class="btn-icon btn-icon-sm variant-soft absolute top-4 right-4 z-10 md:hidden"
			onclick={closeModal}
			aria-label={m.EXIT_FULLSCREEN()}
		>
			<Fa icon={faMinimize} />
		</button>
		<button
			type="button"
			class="btn btn-sm variant-soft absolute top-4 right-4 z-10 hidden md:inline-flex"
			onclick={closeModal}
		>
			<span>{m.EXIT_FULLSCREEN()}</span>
			<Fa icon={faMinimize} />
		</button>
		{#if dialogOpen}
			<h2 class="h2 text-center mb-4 pt-12">{m.CALENDAR()}</h2>
			<div bind:this={fullscreenEl} class="w-full"></div>
		{/if}
	</div>
</Dialog>

<style>
	:global(.fc-event-title) {
		white-space: normal !important;
		overflow-wrap: break-word;
	}
	:global(.fc-daygrid-dot-event) {
		flex-direction: column;
		align-items: flex-start;
	}
	:global(.fc-list-day-cushion) {
		background-color: rgb(var(--color-surface-300)) !important;
		color: rgb(var(--color-surface-900)) !important;
	}
	:global(.dark .fc-list-day-cushion) {
		background-color: rgb(var(--color-surface-700)) !important;
		color: rgb(var(--color-surface-100)) !important;
	}
</style>
