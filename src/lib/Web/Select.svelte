<script lang="ts">
	import Select from 'svelte-select';
	import * as m from '$msgs';

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
	let {
		value = $bindable(),
		filterText = $bindable(''),
		placeholder = m.SELECT_PLACEHOLDER(),
		floatingConfig = {},
		...rest
	}: Record<string, unknown> & {
		value?: unknown;
		filterText?: string;
		placeholder?: string;
		floatingConfig?: Record<string, unknown>;
	} = $props();

	/**
	 * What a screen reader announces. svelte-select's own defaults are English
	 * sentences, and unlike a visible label nothing about them looks wrong on
	 * screen — a French user simply hears English.
	 */
	const ariaValues = (values: string) => m.SELECT_ARIA_VALUES({ values });
	const ariaListOpen = (label: string, count: number) =>
		m.SELECT_ARIA_LIST_OPEN({ label, count });
	const ariaFocused = () => m.SELECT_ARIA_FOCUSED();

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
</script>

<!--
	Only the "empty" slot is forwarded. The item and selection slots are left to
	svelte-select's own defaults: declaring them here means always passing them,
	and an empty forwarded slot renders every option as a blank row.
-->
<div bind:this={host} class="contents">
<Select
	{...rest}
	{placeholder}
	{ariaValues}
	{ariaListOpen}
	{ariaFocused}
	bind:value
	bind:filterText
	floatingConfig={inDialog ? { strategy: 'fixed', ...floatingConfig } : { ...floatingConfig }}
	on:change
	on:clear
	on:select
	on:input
	on:focus
	on:blur
	on:filter
>
	<slot name="empty" slot="empty" />
</Select>
</div>
