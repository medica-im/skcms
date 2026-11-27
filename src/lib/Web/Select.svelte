<script lang="ts">
	import Select from 'svelte-select';
	import type { Snippet } from 'svelte';
	import * as m from '$msgs';
	import NoOptions from '#lib/Web/NoOptions.svelte';

	/**
	 * svelte-select with its dropdown positioned against the viewport.
	 *
	 * Use this everywhere instead of importing svelte-select directly.
	 *
	 * By default svelte-select positions the list with an absolute strategy and
	 * a `flip()` middleware, so when there is no room below the input it opens
	 * the list *upwards*. Inside a <dialog> that puts the list past the top of
	 * the box: the options are drawn over the page behind the modal, where they
	 * can be neither seen nor clicked. The first option is the one lost, so the
	 * select still looks usable — it just silently offers one choice fewer.
	 *
	 * A fixed strategy positions against the viewport rather than the containing
	 * block, so the list escapes the dialog's bounds and stays reachable.
	 *
	 * Applied only inside a dialog, and that restriction matters. A select
	 * sitting in an ordinary scrolling page — the address book filters — is
	 * positioned correctly by the default absolute strategy, and forcing a fixed
	 * one there detaches the list from its input: it was drawn near the top of
	 * the viewport, hundreds of pixels from the box that opened it.
	 *
	 * Callers can still pass their own `floatingConfig`; it is merged over this
	 * one, so a deliberate placement still wins.
	 */
	/**
	 * `value` and `filterText` are declared rather than left to the rest spread:
	 * a spread cannot carry a two-way binding, so `bind:` on anything not named
	 * here silently becomes one-way. Nothing breaks visibly — the list still
	 * renders and options still highlight — but the parent never learns what was
	 * chosen. Add any further bound prop here, not to the spread.
	 */
	/**
	 * Translated here rather than left to svelte-select, whose own default is the
	 * English "Please select". Most call sites pass no placeholder at all, so
	 * that default was what a French visitor actually read — in three dozen
	 * selects across the modals.
	 *
	 * A caller that names its own placeholder still wins: "Sélectionner un rôle"
	 * says more than the generic one.
	 */
	/**
	 * The down arrow is what tells a reader the box is a dropdown; svelte-select
	 * leaves it off by default.
	 */
	/**
	 * An empty list says so in the site language; svelte-select's own default is
	 * the English "No options". A caller's `empty` snippet still wins.
	 */
	let {
		value = $bindable(),
		filterText = $bindable(''),
		placeholder = m.SELECT_PLACEHOLDER(),
		showChevron = true,
		floatingConfig = {},
		empty,
		fitOnPhone = false,
		...rest
	}: Record<string, unknown> & {
		value?: unknown;
		filterText?: string;
		placeholder?: string;
		showChevron?: boolean;
		floatingConfig?: Record<string, unknown>;
		empty?: Snippet;
		/** On a phone, bring the field under the app bar once tapped and open the list below it, above the keyboard. Not inside a dialog, which scrolls on its own. */
		fitOnPhone?: boolean;
	} = $props();

	/**
	 * What a screen reader announces. svelte-select's own defaults are English
	 * sentences, and unlike a visible label nothing about them looks wrong on
	 * screen — a French user simply hears English.
	 */
	const ariaValues = (values: unknown) => m.SELECT_ARIA_VALUES({ values: String(values) });
	const ariaListOpen = (label: unknown, count: number) =>
		m.SELECT_ARIA_LIST_OPEN({ label: String(label), count });
	const ariaFocused = () => m.SELECT_ARIA_FOCUSED();
	// The option field svelte-select displays; a caller may name another.
	const labelKey = $derived((rest.label as string | undefined) ?? 'label');

	/**
	 * Whether this select is inside a <dialog>, decided from the DOM rather than
	 * from a prop: every caller would otherwise have to know, and the ones that
	 * forgot would be exactly the modals that break.
	 */
	let host: HTMLDivElement | undefined = $state();
	let inDialog = $state(false);
	$effect(() => {
		inDialog = !!host?.closest('dialog');
	});

	/**
	 * On a touch screen the browser's mousedown comes after svelte-select's
	 * pointerup has opened the list; landing outside the input, it takes focus
	 * away and the list closes at once. Only the input itself should take focus.
	 */
	const keepFocus = (e: MouseEvent) => {
		if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
	};

	/**
	 * On a touch screen the keyboard takes half the screen: once a choice is tapped, or
	 * cleared, the input lets go of the focus so the keyboard goes away and the choice
	 * shows. Not in a multiple select, where one picks several in a row, nor with a
	 * mouse, where the focus stays where a keyboard user left it. One tick late, because
	 * svelte-select takes the focus back after a clear.
	 */
	let lastPointer = $state('mouse');
	$effect(() => {
		const track = (e: PointerEvent) => (lastPointer = e.pointerType);
		window.addEventListener('pointerdown', track, true);
		return () => window.removeEventListener('pointerdown', track, true);
	});
	const letGo = () => {
		if (rest.multiple || lastPointer !== 'touch') return;
		setTimeout(() => {
			const active = document.activeElement;
			if (active instanceof HTMLElement && host?.contains(active)) active.blur();
		});
	};
	type Callback = ((...args: unknown[]) => void) | undefined;
	const onchange = (...args: unknown[]) => {
		(rest.onchange as Callback)?.(...args);
		letGo();
	};
	const onclear = (...args: unknown[]) => {
		(rest.onclear as Callback)?.(...args);
		letGo();
	};

	/**
	 * On a phone the keyboard takes the lower half of the screen: with `fitOnPhone`, the
	 * field goes to the top, under the app bar, and the list gets the room left above the
	 * keyboard, so it opens downwards instead of squeezing upwards.
	 */
	const box = () => host?.querySelector<HTMLElement>('.svelte-select') ?? null;

	// Until the keyboard shows (some 300ms after the tap) its height is a guess: about
	// this share of the screen on Android and iOS alike. Once it shows, the browser
	// reports what is really left visible.
	const KEYBOARD_SHARE = 0.45;
	const MIN_LIST = 176;
	const GAP = 16;

	function visibleBottom() {
		const viewport = window.visualViewport;
		const keyboardUp = viewport && viewport.height < window.innerHeight * 0.85;
		return keyboardUp
			? viewport.offsetTop + viewport.height
			: window.innerHeight * (1 - KEYBOARD_SHARE);
	}

	const scrollerOf = (el: HTMLElement): HTMLElement => {
		for (let node = el.parentElement; node; node = node.parentElement) {
			const { overflowY } = getComputedStyle(node);
			if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node;
		}
		return document.scrollingElement as HTMLElement;
	};

	// Quick enough not to wait on, slow enough to see where the field went.
	function scrollBy(scroller: HTMLElement, distance: number, done: () => void) {
		const from = scroller.scrollTop;
		const to = Math.min(from + distance, scroller.scrollHeight - scroller.clientHeight);
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || to === from) {
			scroller.scrollTop = to;
			return done();
		}
		const start = performance.now();
		const step = (now: number) => {
			const t = Math.min((now - start) / 200, 1);
			scroller.scrollTop = from + (to - from) * (1 - (1 - t) ** 3);
			if (t < 1) requestAnimationFrame(step);
			else done();
		};
		requestAnimationFrame(step);
	}

	// The page moves only by what the list lacks between the field and the keyboard,
	// and never past the field reaching the top: a short list opens where it is or
	// nearly, so the reader keeps their place; a long one gets the field to the top.
	function fitAboveKeyboard() {
		const el = box();
		if (!el || !window.matchMedia('(max-width: 767px)').matches) return;
		const setRoom = () => {
			const room = visibleBottom() - el.getBoundingClientRect().bottom - GAP;
			el.style.setProperty('--list-max-height', `${Math.max(room, MIN_LIST)}px`);
		};
		// No list open, nothing to make room for: a clear gives the field the focus back
		// with its list closed.
		const list = el.querySelector<HTMLElement>('.svelte-select-list');
		if (!list) return;
		const lacking = list.scrollHeight - (visibleBottom() - el.getBoundingClientRect().bottom - GAP);
		if (lacking <= 0) return setRoom();
		const scroller = scrollerOf(el);
		const top = scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top;
		const toTop = el.getBoundingClientRect().top - top - 8;
		scrollBy(scroller, Math.min(lacking, toTop), setRoom);
	}

	// A tap ends with a click the browser sends where the finger touched: scrolling
	// before it moves the page under the finger, the click lands beside the select,
	// which closes its list and drops the focus before the keyboard can show.
	function afterTap(then: () => void) {
		let done = false;
		const run = () => {
			if (done) return;
			done = true;
			window.removeEventListener('click', run, true);
			requestAnimationFrame(then);
		};
		window.addEventListener('click', run, true);
		setTimeout(run, 400);
	}

	const onfocus = (event: FocusEvent) => {
		(rest.onfocus as Callback)?.(event);
		if (!fitOnPhone || inDialog) return;
		const input = event.target;
		afterTap(() => {
			if (document.activeElement !== input) return;
			fitAboveKeyboard();
			window.visualViewport?.addEventListener('resize', fitAboveKeyboard);
		});
	};

	const onblur = (event: FocusEvent) => {
		(rest.onblur as Callback)?.(event);
		window.visualViewport?.removeEventListener('resize', fitAboveKeyboard);
		box()?.style.removeProperty('--list-max-height');
	};

	$effect(() => () => window.visualViewport?.removeEventListener('resize', fitAboveKeyboard));
</script>

{#snippet noOptions()}
	<NoOptions />
{/snippet}

<!-- svelte-select cuts a long option off with an ellipsis; the title shows the
     whole of it on hover. -->
{#snippet titledItem({ item }: { item: Record<string, unknown> })}
	<span title={item?.[labelKey] as string}>{item?.[labelKey]}</span>
{/snippet}

<div bind:this={host} class="contents" onmousedown={keepFocus} role="none">
	<Select
		{...rest}
		{onchange}
		{onclear}
		{onfocus}
		{onblur}
		{placeholder}
		{showChevron}
		{ariaValues}
		{ariaListOpen}
		{ariaFocused}
		bind:value
		bind:filterText
		floatingConfig={inDialog ? { strategy: 'fixed', ...floatingConfig } : { ...floatingConfig }}
		empty={empty ?? noOptions}
		item={titledItem}
	/>
</div>
