<script lang="ts">
	import { page } from '$app/state';
	import CreateInviteeModal from '$lib/Invitee/CreateInviteeModal.svelte';
	import CreateInvitee from '$routes/(common)/web/invite/create/+page.svelte';
	import EditInviteeModal from '$lib/Invitee/EditInviteeModal.svelte';
	import DeleteInviteeModal from '$lib/Invitee/DeleteInviteeModal.svelte';
	import { Invitee } from '$lib/Invitee';
	import { preloadData, pushState, goto, invalidateAll } from '$app/navigation';
	import { faPlus, faFileLines, faPaperPlane, faGear, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import ExportModeToggle from '$lib/components/ExportModeToggle/ExportModeToggle.svelte';
	import * as m from '$msgs';
	import { normalize } from '$lib/helpers/stringHelpers.ts';
	import { ORIGIN } from '$lib/utils/origin.ts';
	import type { PageData } from './$types';
	import { base } from '$app/paths';
	import { sortByDateTime, type SortDirection } from '$lib/utils/dateTimeSort';
	import SortHeader from '$lib/components/Table/SortHeader.svelte';
	import SortSelect from '$lib/components/Table/SortSelect.svelte';
	import Pagination from '$lib/components/Table/Pagination.svelte';
	import { paginate, pageFromParam, pageSizeFromParam, PAGE_SIZES, type PageSize } from '$lib/utils/paginate';
	import InviteeStatusFilter from '$lib/Invitee/InviteeStatusFilter.svelte';
	import { getLiveDeliveries } from '$lib/Invitee/liveDeliveries.svelte';
	import ResendBar from '$lib/Invitee/ResendBar.svelte';
	import ResendConfirmDialog from '$lib/Invitee/ResendConfirmDialog.svelte';
	import BatchResendStatus from '$lib/Invitee/BatchResendStatus.svelte';
	import ListDateTime from '$lib/components/DateTime/ListDateTime.svelte';
	import { resendEligibility, initialResendSelection, type ResendEligibility, type ResendRefusal } from '$lib/Invitee/resendSelection';
	import { isRunning, type ResendJob } from '$lib/Invitee/batchResend';
	import { startBatchResend } from '$src/invitee.remote.ts';
	import {
		countByStatus,
		filterFromParam,
		filterInvitees,
		filterToParam,
		type InviteeFilter
	} from '$lib/Invitee/inviteeFilter';

	let { data }: { data: PageData } = $props();
	// Each email's status as the backend pushes it (bounced, delivered...),
	// over what the page loaded: see $lib/Invitee/liveDeliveries.svelte.ts.
	const live = getLiveDeliveries();
	let invitees = $derived(live.apply(data.invitees));
	let searchTerm = $state('');

	// Sorted by creation or by use, newest first by default: the API returns
	// invitations in no order, and the one an administrator looks for is
	// usually the one just sent. Clicking the active column reverses it. An
	// unused invitation has no use date and stays last either way.
	type SortColumn = 'createdAt' | 'redeemedAt';
	let sortColumn = $state<SortColumn>('createdAt');
	let sortDirection = $state<SortDirection>('desc');

	function sortBy(column: SortColumn) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
		} else {
			sortColumn = column;
			sortDirection = 'desc';
		}
		firstPage();
	}

	// The status filter, the page and its size live in the address
	// (?statut=, ?page=, ?par=), so the back button, a reload and a shared
	// link keep them. "Toutes", page 1 and the default size are no parameter.
	const urlFilter = $derived(filterFromParam(page.url.searchParams.get('statut')));
	const pageNumber = $derived(pageFromParam(page.url.searchParams.get('page')));
	const pageSize = $derived(pageSizeFromParam(page.url.searchParams.get('par')));

	function navigate(change: (url: URL) => void, noScroll = true) {
		const url = new URL(page.url);
		change(url);
		goto(url, { keepFocus: true, noScroll });
	}

	function setStatusFilter(filter: InviteeFilter) {
		const param = filterToParam(filter);
		navigate((url) => {
			if (param) url.searchParams.set('statut', param);
			else url.searchParams.delete('statut');
			url.searchParams.delete('page');
		});
	}

	function setPage(number: number) {
		navigate((url) => {
			if (number > 1) url.searchParams.set('page', String(number));
			else url.searchParams.delete('page');
		}, false);
	}

	function setPageSize(size: PageSize) {
		navigate((url) => {
			if (size !== PAGE_SIZES[0]) url.searchParams.set('par', String(size));
			else url.searchParams.delete('par');
			url.searchParams.delete('page');
		});
	}

	function firstPage() {
		if (page.url.searchParams.has('page')) navigate((url) => url.searchParams.delete('page'));
	}

	// A reminder goes to active invitations only: the filter holds on them.
	let resendMode = $state(false);
	const statusFilter = $derived<InviteeFilter>(resendMode ? 'active' : urlFilter);

	// Active and deactivated invitations have no use date, so sorting them by
	// use would say nothing: they sort by creation then, and the Utilisation
	// header is disabled.
	const canSortByUse = $derived(statusFilter === 'all' || statusFilter === 'used');
	const effectiveSortColumn = $derived<SortColumn>(canSortByUse ? sortColumn : 'createdAt');

	// Search first, so the counts describe what the search lets through.
	let searchedInvitees = $derived.by(() => {
		if (!invitees || !searchTerm.trim()) return invitees;
		const term = normalize(searchTerm);
		return invitees.filter(
			(inv) => (inv.name && normalize(inv.name).includes(term)) || normalize(inv.email).includes(term)
		);
	});
	const statusCounts = $derived(countByStatus(searchedInvitees ?? []));
	// Addresses to check in the whole list, whatever the search: the banner.
	// Live, since `invitees` takes the pushed deliveries (LiveDeliveries).
	const toCheck = $derived(countByStatus(invitees ?? []).check);
	let filteredInvitees = $derived(
		searchedInvitees &&
			sortByDateTime(
				filterInvitees(searchedInvitees, statusFilter),
				(inv) => inv[effectiveSortColumn],
				sortDirection
			)
	);
	let editModal: EditInviteeModal;
	let deleteModal: DeleteInviteeModal;
	let createOpen: boolean = $state(false);

	const isSuperuser = $derived(page.data?.user?.role === 'superuser');

	let exportMode = $state(false);
	let selectedUids = $state<Set<string>>(new Set());
	let exporting = $state(false);

	function updateSelectionForExportMode() {
		if (exportMode && filteredInvitees) {
			selectedUids = new Set(filteredInvitees.map((i) => i.uid));
		} else {
			selectedUids = new Set();
		}
	}

	function toggleAll() {
		if (!filteredInvitees) return;
		if (selectedUids.size === filteredInvitees.length) {
			selectedUids = new Set();
		} else {
			selectedUids = new Set(filteredInvitees.map((i) => i.uid));
		}
	}

	function toggleInvitee(uid: string) {
		const next = new Set(selectedUids);
		if (next.has(uid)) {
			next.delete(uid);
		} else {
			next.add(uid);
		}
		selectedUids = next;
	}

	async function exportCsv() {
		if (selectedUids.size === 0) return;
		exporting = true;
		try {
			const response = await fetch(`${ORIGIN}/api/v2/invitees/export/listmonk`, {
				credentials: 'include',
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ invitee_uids: [...selectedUids] })
			});
			if (!response.ok) {
				throw new Error(`Export failed: ${response.status}`);
			}
			const blob = await response.blob();
			const disposition = response.headers.get('Content-Disposition') ?? '';
			const match = disposition.match(/filename="?([^"]+)"?/);
			const filename = match?.[1] ?? 'listmonk_invitees.csv';
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error: any) {
			console.error('Export error:', error.message);
		} finally {
			exporting = false;
		}
	}

	let allSelected = $derived(
		filteredInvitees != null && filteredInvitees.length > 0 && selectedUids.size === filteredInvitees.length
	);

	// --- Reminders (resend mode) ---------------------------------------------

	// The latest reminder: as loaded, then as started from this page.
	let resendJob = $derived<ResendJob | null>(data.latestResend ?? null);
	const resendRunning = $derived(resendJob != null && isRunning(resendJob));

	let resendNow = $state(Date.now());
	let onlyExcluded = $state(false);
	const eligibility = $derived.by(() => {
		const map = new Map<string, ResendEligibility>();
		if (!resendMode) return map;
		for (const invitee of invitees ?? []) {
			map.set(invitee.uid, resendEligibility(invitee, resendNow, data.resendAfterDays));
		}
		return map;
	});
	const sendableUids = $derived([...eligibility].filter(([, e]) => e.sendable).map(([uid]) => uid));
	const activeCount = $derived(countByStatus(invitees ?? []).active);

	function enterResendMode() {
		resendNow = Date.now();
		exportMode = false;
		onlyExcluded = false;
		resendMode = true;
		selectedUids = initialResendSelection(invitees ?? [], resendNow, data.resendAfterDays);
		firstPage();
	}

	function leaveResendMode() {
		resendMode = false;
		onlyExcluded = false;
		selectedUids = new Set();
		firstPage();
	}

	const REFUSAL_LABEL: Record<ResendRefusal, () => string> = {
		used: m.INVITEE_STATUS_USED,
		disabled: m.INVITEE_STATUS_DISABLED,
		queued: m.INVITEE_RESEND_REASON_QUEUED,
		address: m.INVITEE_RESEND_REASON_ADDRESS
	};

	let confirmDialog: HTMLDialogElement | undefined = $state();
	let starting = $state(false);
	let startError = $state('');

	function askToSend() {
		startError = '';
		confirmDialog?.showModal();
	}

	async function send() {
		starting = true;
		startError = '';
		const uids = [...selectedUids];
		const result = await startBatchResend({ uids });
		starting = false;
		if (result.success && result.jobUid) {
			confirmDialog?.close();
			resendJob = {
				uid: result.jobUid,
				status: 'pending',
				created_at: new Date().toISOString(),
				phase: 'sending',
				total_rows: uids.length,
				processed_rows: 0,
				emails_total: uids.length,
				emails_processed: 0,
				email_skipped_count: 0,
				failed_email_count: 0
			};
			leaveResendMode();
		} else {
			startError = result.code === 'batch_running' ? m.INVITEE_RESEND_BATCH_RUNNING() : m.INVITEE_RESEND_START_FAILED();
		}
	}

	// --- The rows on this page -------------------------------------------------

	const listed = $derived(
		resendMode && onlyExcluded
			? (filteredInvitees ?? []).filter((i) => !selectedUids.has(i.uid))
			: (filteredInvitees ?? [])
	);
	const view = $derived(paginate(listed, pageNumber, pageSize));
</script>

<div class="container mx-auto p-4">
	<header class="mb-6 space-y-4">
		<div class="flex justify-between items-center">
			<div>
				<h1 class="h1 mb-2">{m.INVITEE_PAGE_TITLE()}</h1>
				<p class="text-surface-600">
					{filteredInvitees?.length ?? 0} {m.invitee_noun({ count: filteredInvitees?.length ?? 0 })}
				</p>
			</div>
			<div class="flex gap-2">
				<button
					type="button"
					class="btn variant-filled-secondary"
					title={m.INVITEE_RESEND_MODE_TITLE()}
					disabled={resendMode || resendRunning}
					onclick={enterResendMode}
				>
					<span><Fa icon={faPaperPlane} /></span>
					<span class="hidden lg:block">{m.INVITEE_RESEND_MODE_BUTTON()}</span>
				</button>
				<a
					href="{base}/web/invite/reminder-logs"
					class="btn min-h-11 variant-ghost-secondary"
					class:pointer-events-none={resendMode}
					class:opacity-50={resendMode}
					tabindex={resendMode ? -1 : undefined}
					aria-label={m.REMINDER_LOGS_TITLE()}
					title={m.REMINDER_LOGS_TITLE()}
				>
					<Fa icon={faClockRotateLeft} />
				</a>
				<a
					href="{base}/web/invite/batch"
					class:pointer-events-none={resendMode}
					tabindex={resendMode ? -1 : undefined}
				>
					<button class="btn variant-filled-secondary" title={m.BATCH_INVITEE_BUTTON_TITLE()} disabled={resendMode}>
						<span><Fa icon={faFileLines} /></span>
						<span class="hidden lg:block">{m.BATCH_INVITEE_BUTTON()}</span>
					</button>
				</a>
				<a
					href="{base}/web/invite/create"
					class:pointer-events-none={resendMode}
					tabindex={resendMode ? -1 : undefined}
					onclick={async (e) => {
						if (e.shiftKey || e.metaKey || e.ctrlKey) return;

						e.preventDefault();
						const { href } = e.currentTarget;
						const result = await preloadData(href);

						if (result.type === 'loaded' && result.status === 200) {
							createOpen = true;
							pushState(href, { selected: result.data });
						} else {
							goto(href);
						}
					}}
				>
					<button class="btn variant-filled-primary" title={m.INVITEE_CREATE_BUTTON()} disabled={resendMode}>
						<span><Fa icon={faPlus} /></span>
						<span class="hidden lg:block">{m.INVITEE_CREATE_BUTTON()}</span>
					</button>
				</a>
			</div>
		</div>
		{#if isSuperuser && !resendMode}
			<div class="flex justify-end gap-2">
				<a href="{base}/web/invite/settings" class="btn min-h-11 variant-ghost" title={m.INVITATION_SETTINGS_TITLE()}>
					<span><Fa icon={faGear} /></span>
					<span>{m.INVITATION_SETTINGS_TITLE()}</span>
				</a>
				<ExportModeToggle bind:checked={exportMode} onchange={updateSelectionForExportMode} />
			</div>
		{/if}
	</header>

	{#if resendJob}
		{#key resendJob.uid}
			<BatchResendStatus job={resendJob} onfinished={() => invalidateAll()} />
		{/key}
	{/if}

	{#if resendMode}
		<aside class="alert variant-soft-primary mb-4" data-testid="resend-mode">
			<div class="alert-message">
				<p class="font-semibold">{m.INVITEE_RESEND_MODE_TITLE()}</p>
				<p class="text-sm">{m.INVITEE_RESEND_MODE_HINT({ days: data.resendAfterDays })}</p>
			</div>
		</aside>
	{/if}

	<!-- Search, and the status filter: side by side on a large screen,
	     stacked on a narrow one. -->
	{#if toCheck > 0 && statusFilter !== 'check' && !resendMode}
		<aside class="alert variant-soft-warning mb-4" data-testid="invitee-check-banner">
			<div class="alert-message">
				<p class="font-semibold">{m.INVITEE_CHECK_BANNER({ count: toCheck })}</p>
				<p class="text-sm">{m.INVITEE_CHECK_BANNER_HINT()}</p>
			</div>
			<div class="alert-actions">
				<button type="button" class="btn min-h-11 variant-filled-warning" onclick={() => setStatusFilter('check')}>
					{m.INVITEE_CHECK_BANNER_SHOW()}
				</button>
			</div>
		</aside>
	{/if}

	<div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
		<input
			type="search"
			class="input w-full max-w-sm"
			placeholder="{m.INVITEE_COL_NAME()} / {m.INVITEE_COL_EMAIL()}..."
			bind:value={searchTerm}
			oninput={firstPage}
		/>
		<InviteeStatusFilter value={statusFilter} counts={statusCounts} onchange={setStatusFilter} disabled={resendMode} />
	</div>

	{#if exportMode}
		<div class="mb-4 flex items-center gap-4">
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					class="checkbox"
					checked={allSelected}
					onchange={toggleAll}
				/>
				<span class="text-sm font-semibold">
					{allSelected ? m.USERS_DESELECT_ALL() : m.USERS_SELECT_ALL()}
				</span>
			</label>
			<span class="text-sm text-surface-500">
				{m.USERS_SELECTED_COUNT({ selected: selectedUids.size, total: filteredInvitees?.length ?? 0 })}
			</span>
			<button
				class="btn variant-filled-primary ml-auto"
				disabled={selectedUids.size === 0 || exporting}
				onclick={exportCsv}
			>
				{exporting ? m.USERS_EXPORTING() : m.INVITEE_EXPORT_SELECTION({ count: selectedUids.size })}
			</button>
		</div>
	{/if}

	<SortSelect
		value={`${effectiveSortColumn}:${sortDirection}`}
		options={[
			{ value: 'createdAt:desc', label: m.INVITEE_SORT_CREATED_NEWEST() },
			{ value: 'createdAt:asc', label: m.INVITEE_SORT_CREATED_OLDEST() },
			...(canSortByUse
				? [
						{ value: 'redeemedAt:desc', label: m.INVITEE_SORT_REDEEMED_NEWEST() },
						{ value: 'redeemedAt:asc', label: m.INVITEE_SORT_REDEEMED_OLDEST() }
					]
				: [])
		]}
		onchange={(value) => {
			const [column, direction] = value.split(':');
			sortColumn = column as SortColumn;
			sortDirection = direction as SortDirection;
			firstPage();
		}}
	/>

	<!-- Column Headers (large screens only) -->
	<div class="hidden lg:grid lg:items-center lg:gap-4 px-3 pb-2 text-sm font-semibold text-surface-500"
		class:lg:grid-cols-[40px_40px_1fr_1.5fr_120px_130px_130px_120px_130px_36px_36px_36px]={exportMode}
		class:lg:grid-cols-[44px_40px_1fr_1.5fr_120px_130px_130px_120px_130px_36px_36px_36px]={resendMode}
		class:lg:grid-cols-[40px_1fr_1.5fr_120px_130px_130px_120px_130px_36px_36px_36px]={!exportMode && !resendMode}
	>
		{#if exportMode || resendMode}<span></span>{/if}
		<span></span>
		<span>{m.INVITEE_COL_NAME()}</span>
		<span>{m.INVITEE_COL_EMAIL()}</span>
		<span>{m.INVITEE_COL_ROLE()}</span>
		<SortHeader
			label={m.INVITEE_COL_CREATED()}
			active={effectiveSortColumn === 'createdAt'}
			direction={sortDirection}
			onclick={() => sortBy('createdAt')}
		/>
		<SortHeader
			label={m.INVITEE_COL_REDEEMED()}
			active={effectiveSortColumn === 'redeemedAt'}
			direction={sortDirection}
			onclick={() => sortBy('redeemedAt')}
			disabled={!canSortByUse}
		/>
		<span>{m.INVITEE_COL_STATUS()}</span>
		<span>{m.INVITEE_COL_EMAIL_DELIVERY()}</span>
		<span class="col-span-3 text-center">{m.INVITEE_COL_ACTIONS()}</span>
	</div>

	<div class="grid grid-cols-1 gap-2">
		{#each view.rows as invitee (invitee.uid)}
			{#if exportMode}
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						class="checkbox flex-shrink-0"
						checked={selectedUids.has(invitee.uid)}
						onchange={() => toggleInvitee(invitee.uid)}
					/>
					<div class="flex-1">
						<Invitee {invitee} highlighted={(Date.now() - new Date(invitee.createdAt).getTime()) < 60_000} onEdit={(inv) => editModal.handleEdit(inv)} onDelete={(inv) => deleteModal.handleDelete(inv)} />
					</div>
				</div>
			{:else if resendMode}
				{@const reminder = eligibility.get(invitee.uid)}
				<div class="flex items-start gap-1" data-testid="resend-row">
					<label class="w-11 h-11 flex flex-shrink-0 items-center justify-center mt-2">
						<input
							type="checkbox"
							class="checkbox"
							aria-label={m.INVITEE_RESEND_SELECT({ email: invitee.email })}
							checked={selectedUids.has(invitee.uid)}
							disabled={!reminder?.sendable}
							onchange={() => toggleInvitee(invitee.uid)}
						/>
					</label>
					<div class="flex-1 min-w-0">
						<Invitee {invitee} />
						{#if reminder && !reminder.sendable}
							<p class="px-3 pt-1 text-sm text-surface-600-300-token" data-testid="resend-reason">
								{REFUSAL_LABEL[reminder.reason]()}
							</p>
						{:else if reminder && !reminder.preselected && invitee.emailDelivery}
							<p class="px-3 pt-1 text-sm text-surface-600-300-token" data-testid="resend-reason">
								{m.INVITEE_RESEND_REASON_RECENT()} · <ListDateTime value={invitee.emailDelivery.at} />
							</p>
						{/if}
					</div>
				</div>
			{:else}
				<Invitee {invitee} highlighted={(Date.now() - new Date(invitee.createdAt).getTime()) < 60_000} onEdit={(inv) => editModal.handleEdit(inv)} onDelete={(inv) => deleteModal.handleDelete(inv)} />
			{/if}
		{/each}
	</div>

	<Pagination
		page={view.page}
		pages={view.pages}
		size={pageSize}
		total={listed.length}
		onpage={setPage}
		onsize={setPageSize}
	/>

	{#if resendMode}
		<ResendBar
			selected={selectedUids.size}
			sendable={sendableUids.length}
			{onlyExcluded}
			onselectall={() => (selectedUids = new Set(sendableUids))}
			onselectnone={() => (selectedUids = new Set())}
			ononlyexcluded={(only) => {
				onlyExcluded = only;
				firstPage();
			}}
			oncancel={leaveResendMode}
			onsend={askToSend}
		/>
	{/if}
</div>

<ResendConfirmDialog
	bind:dialog={confirmDialog}
	count={selectedUids.size}
	excluded={activeCount - selectedUids.size}
	busy={starting}
	error={startError}
	onconfirm={send}
/>

{#if createOpen}
	<CreateInviteeModal onresult={() => {}} title={"Créer une invitation"}>
		<CreateInvitee data={page.state.selected ?? data} onclose={() => {
			createOpen = false;
			history.back();
		}} />
	</CreateInviteeModal>
{/if}

<EditInviteeModal bind:this={editModal} />
<DeleteInviteeModal bind:this={deleteModal} />
