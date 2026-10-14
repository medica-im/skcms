<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { Calendar, type CalendarOptions, type EventSourceInput } from '@fullcalendar/core';
	import dayGridPlugin from '@fullcalendar/daygrid';
	import listPlugin from '@fullcalendar/list';
	// FullCalendar resolves `locale` against the locales it has been given, and
	// falls back to its English defaults for a code it does not know. Passing
	// 'fr' alone was doing exactly that — hence "No events to display" on an
	// empty month, while the buttons looked translated because they are
	// overridden by hand below. Registering the locale object translates
	// everything else FullCalendar renders on its own, and sets the French week
	// (Monday first) with it.
	import frLocale from '@fullcalendar/core/locales/fr';
	import { getLocale } from '$prgld/runtime.js';
	import Dialog from '$lib/Web/Dialog.svelte';
	import Fa from 'svelte-fa';
	import { faMaximize, faMinimize } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';

	type View = 'dayGridMonth' | 'listMonth' | 'listRange';

	let {
		events,
		options = {},
		range,
		heading,
		locale = getLocale(),
		view,
		footer
	}: {
		events: EventSourceInput;
		/** Extra FullCalendar options; their `plugins` are added to the built-in ones. */
		options?: CalendarOptions;
		/**
		 * The dates the calendar keeps to: the list shows all of them at once,
		 * the month view opens on the first, and navigation stays inside.
		 */
		range?: { start: Date; end: Date };
		heading?: string;
		locale?: string;
		view?: View;
		footer?: Snippet;
	} = $props();

	/**
	 * Where the toolbar stops fitting.
	 *
	 * Tailwind's md, the same breakpoint the view already switches at: below it
	 * FullCalendar is given the list view, which makes the month/list switcher
	 * a choice this component overrides anyway.
	 */
	const PHONE = 768;

	let innerWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);
	let listView: View = $derived(range ? 'listRange' : 'listMonth');
	let effectiveView: View = $derived(
		view ?? (range || innerWidth < PHONE ? listView : 'dayGridMonth')
	);

	let calendarEl: HTMLDivElement;
	let calendar: Calendar;

	let dialog: HTMLDialogElement | undefined = $state();
	let dialogOpen = $state(false);
	let fullscreenEl: HTMLDivElement | undefined = $state();

	function rangeConfig(): CalendarOptions {
		if (!range) return {};
		// A duration from the first day, not a visibleRange: FullCalendar enables
		// prev/next when the neighbouring period meets validRange, and a
		// visibleRange view's neighbours are the range itself.
		const days = Math.ceil((range.end.getTime() - range.start.getTime()) / 86_400_000);
		return {
			validRange: range,
			initialDate: range.start,
			views: {
				listRange: { type: 'list', duration: { days }, buttonText: m.CALENDAR_LIST() }
			}
		};
	}

	function calendarConfig(initialView: View): CalendarOptions {
		return {
			...options,
			plugins: [dayGridPlugin, listPlugin, ...(options.plugins ?? [])],
			initialView,
			events,
			// Only French is registered: FullCalendar's built-in defaults are
			// already English, so `locale: 'en'` resolves without an entry here.
			locales: [frLocale],
			locale,
			contentHeight: 'auto' as const,
			buttonText: {
				today: m.CALENDAR_TODAY(),
				month: m.CALENDAR_MONTH(),
				list: m.CALENDAR_LIST()
			},
			// Every control at every width. FullCalendar lays left/center/right on
			// one row and does not reflow them, so on a phone the view switcher
			// ended 21px past the container's edge; the row is made to wrap in
			// the CSS at the foot of this file instead, which costs height rather
			// than a control. ToolbarInput has no second row to ask for.
			headerToolbar: {
				left: range ? 'prev,next' : 'prev,next today',
				center: 'title',
				right: `dayGridMonth,${listView}`
			},
			...rangeConfig()
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

<div class="card variant-ghost relative w-full p-2 lg:p-4 space-y-2 lg:space-y-4">
	<!--
		Beside the heading when there is one. Without it the top-right corner is
		the toolbar's view switcher, so the buttons take a row of their own.
	-->
	<div class={heading ? '' : 'flex justify-end'}>
		<button
			type="button"
			class="btn-icon variant-soft {heading ? 'absolute top-2 right-2 z-10' : ''} md:hidden min-h-[44px] min-w-[44px]"
			onclick={openModal}
			aria-label={m.FULLSCREEN()}
		>
			<Fa icon={faMaximize} />
		</button>
		<button
			type="button"
			class="btn variant-soft {heading ? 'absolute top-2 right-2 z-10' : ''} hidden md:inline-flex min-h-[44px]"
			onclick={openModal}
		>
			<span>{m.FULLSCREEN()}</span>
			<Fa icon={faMaximize} />
		</button>
	</div>
	{#if heading}
		<h2 class="h2 text-center">{heading}</h2>
	{/if}
	<div bind:this={calendarEl} class="w-full"></div>
	{@render footer?.()}
</div>

<Dialog bind:dialog classProp="w-[95vw] h-[95vh] max-w-none" overflow="overflow-auto">
	<div class="relative w-full h-full p-4">
		<button
			type="button"
			class="btn-icon variant-soft absolute top-4 right-4 z-10 md:hidden min-h-[44px] min-w-[44px]"
			onclick={closeModal}
			aria-label={m.EXIT_FULLSCREEN()}
		>
			<Fa icon={faMinimize} />
		</button>
		<button
			type="button"
			class="btn variant-soft absolute top-4 right-4 z-10 hidden md:inline-flex min-h-[44px]"
			onclick={closeModal}
		>
			<span>{m.EXIT_FULLSCREEN()}</span>
			<Fa icon={faMinimize} />
		</button>
		{#if dialogOpen}
			<h2 class="h2 text-center mb-4 pt-12">{heading ?? m.CALENDAR()}</h2>
			<div bind:this={fullscreenEl} class="w-full"></div>
		{/if}
	</div>
</Dialog>

<style>
	/*
	 * The month title, sized to the screen rather than to the desktop.
	 *
	 * FullCalendar sets 1.75em and leaves it there, so "août 2026" arrived at
	 * 28px on a 320px phone and wrapped onto two lines inside a 73px box. clamp
	 * keeps that 28px where there is room for it and scales down where there is
	 * not; the floor is the smallest size still comfortable to read at arm's
	 * length, which matters here because this project's readers average 50+.
	 */
	:global(.fc .fc-toolbar-title) {
		font-size: clamp(1.0625rem, 4.2vw, 1.75rem);
		line-height: 1.2;
		white-space: nowrap;
	}

	/*
	 * The stacked variant: keep every control, wrap instead of overflowing.
	 *
	 * FullCalendar's toolbar is a flex row with no wrapping, and its config has
	 * no second row (ToolbarInput is left/center/right only), so a phone-sized
	 * screen simply gets a chunk sticking out past the edge. Letting it wrap and
	 * giving the title the full width puts it on its own line above the
	 * controls, which is the same arrangement the config cannot express.
	 *
	 * Scoped to the phone width the component already switches views at.
	 */
	@media (max-width: 767px) {
		:global(.fc-header-toolbar) {
			flex-wrap: wrap;
			justify-content: center;
			/*
			 * One gap value for both axes, so the space between the title row and
			 * the controls is the space between the control groups. FullCalendar
			 * otherwise sets a bottom margin on the toolbar only, which reads as
			 * an uneven stack once the row wraps.
			 */
			gap: 0.75rem;
		}
		/* The title takes the full width, which is what puts it on its own row. */
		:global(.fc-toolbar-chunk:nth-child(2)) {
			order: -1;
			flex-basis: 100%;
			text-align: center;
		}
		/*
		 * The month sits below the card's "Calendrier" heading in weight as well
		 * as position: the heading names the thing, the month is what changes
		 * inside it, and at equal size the two competed for the eye.
		 */
		:global(.fc .fc-toolbar-title) {
			font-size: clamp(1.125rem, 5vw, 1.375rem);
			font-weight: 500;
		}
	}

	/*
	 * The month centred on the card, like the "Calendrier" heading above it.
	 *
	 * FullCalendar's toolbar is `justify-content: space-between` over three
	 * chunks, which centres the middle one only when the outer two are the same
	 * width. They are not — "Aujourd'hui" with the arrows measured 213px against
	 * the switcher's 116px — so the month sat 49px right of centre while the
	 * heading directly above it was exact, and the two read as misaligned.
	 *
	 * Giving the outer chunks equal flex and letting the middle size itself puts
	 * the month on the card's true centre line at every width. Not applied on
	 * phones, where the title takes a row of its own and is already centred.
	 */
	@media (min-width: 768px) {
		:global(.fc .fc-header-toolbar .fc-toolbar-chunk:first-child),
		:global(.fc .fc-header-toolbar .fc-toolbar-chunk:last-child) {
			flex: 1 1 0;
		}
		:global(.fc .fc-header-toolbar .fc-toolbar-chunk:last-child) {
			display: flex;
			justify-content: flex-end;
		}
		:global(.fc .fc-header-toolbar .fc-toolbar-chunk:nth-child(2)) {
			flex: 0 0 auto;
		}
	}

	/*
	 * Which view is showing, made visible.
	 *
	 * FullCalendar marks the current view's button with .fc-button-active and
	 * styles it by darkening the fill: rgb(26,37,47) against rgb(44,62,80),
	 * which is 1.28:1 — a difference the eye does not find. On first paint that
	 * reads as nothing being selected at all, when in fact the view has been
	 * chosen for the screen (list on a phone, month above it).
	 *
	 * Given the accent instead, plus a ring, so the pressed control is obvious
	 * without depending on one shade of navy against another.
	 */
	:global(.fc .fc-button-primary.fc-button-active),
	:global(.fc .fc-button-primary:not(:disabled):active) {
		/*
		 * !important because FullCalendar's own .fc-button-primary rules are
		 * more specific than anything reachable from here, and the tokens come
		 * from `body` (Skeleton defines them there, not on :root) so they
		 * resolve by inheritance.
		 */
		background-color: rgb(var(--color-primary-500)) !important;
		border-color: rgb(var(--color-primary-500)) !important;
		color: rgb(var(--on-primary)) !important;
	}

	/*
	 * FullCalendar's own controls, brought to the 44px this project holds as the
	 * minimum tap target: its buttons measured 39-40px, and the readers here
	 * average 50+.
	 */
	:global(.fc .fc-button) {
		min-height: 44px;
	}

	/*
	 * The grid's own lines, which FullCalendar leaves at a hardcoded #ddd.
	 *
	 * That is nearly invisible against the page (measured: #ddd on
	 * rgb(249,250,251)), so the month view reads as floating dates rather than
	 * a grid of days — and being a fixed colour it does not follow the theme,
	 * so dark mode gets a light grey line on a dark surface.
	 *
	 * Bound to the surface tokens instead, so the lines track the palette in
	 * both themes and are dark enough to read as boundaries.
	 */
	:global(.fc) {
		/*
		 * surface-500, not the 300 a border usually takes: the card behind the
		 * grid is itself a translucent grey, so composite the layers and a
		 * 300-weight line lands at 1.05:1 against what is actually painted —
		 * invisible, which is the complaint this fixes. Measured, not guessed.
		 */
		--fc-border-color: rgb(var(--color-surface-500));
	}
	:global(.dark .fc) {
		/*
		 * Lighter here, against a dark surface: this composites to 4.67:1,
		 * comfortably past the 3:1 WCAG asks of a non-text boundary.
		 */
		--fc-border-color: rgb(var(--color-surface-400));
	}

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
