<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ORIGIN } from '$lib/utils/origin.ts';
	import Fa from 'svelte-fa';
	import {
		faArrowLeft,
		faUpload,
		faCheck,
		faXmark,
		faExclamationTriangle,
		faSpinner,
		faBan,
		faExternalLinkAlt,
		faClockRotateLeft
	} from '@fortawesome/free-solid-svg-icons';
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import * as m from '$msgs';
	import type { Role } from '$lib/interfaces/v2/invitee';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Step = 'upload' | 'mapping' | 'processing' | 'done';
	let step: Step = $state('upload');

	// File upload
	let fileInput: HTMLInputElement;
	let selectedFile: File | null = $state(null);
	let columns: string[] = $state([]);
	let previewRows: Record<string, string>[] = $state([]);
	let parseError: string = $state('');
	let parsing: boolean = $state(false);

	// Column mapping (svelte-select binds the full option object)
	interface ColOption { value: string; label: string }
	let splitName: boolean = $state(false);
	let emailColumnSel: ColOption | null = $state(null);
	let nameColumnSel: ColOption | null = $state(null);
	let firstNameColumnSel: ColOption | null = $state(null);
	let lastNameColumnSel: ColOption | null = $state(null);
	let emailColumn = $derived(emailColumnSel ? emailColumnSel.value : '');
	let nameColumn = $derived(nameColumnSel ? nameColumnSel.value : '');
	let firstNameColumn = $derived(firstNameColumnSel ? firstNameColumnSel.value : '');
	let lastNameColumn = $derived(lastNameColumnSel ? lastNameColumnSel.value : '');

	// Role & options
	const roleOptions = [
		{ value: 'staff', label: m['ROLE.STAFF']() },
		{ value: 'administrator', label: m['ROLE.ADMINISTRATOR']() }
	];
	const superUserRole = { value: 'superuser', label: m['ROLE.SUPERUSER']() };
	const isSuperUser = $derived(page.data?.user?.role == 'superuser');
	const getRoleOptions = $derived(() => {
		if (isSuperUser) return [...roleOptions, superUserRole];
		return roleOptions;
	});
	let selectedRole: { value: Role; label: string } | undefined = $state();
	let sendEmails: boolean = $state(true);

	// Processing state
	let jobUid: string = $state('');
	let progress = $state({
		status: '',
		total_rows: 0,
		processed_rows: 0,
		successful_count: 0,
		failed_count: 0,
		skipped_duplicate_email_count: 0,
		skipped_active_user_count: 0,
		failed_email_count: 0,
		percentage: 0
	});
	let summary: any[] = $state([]);
	let pollInterval: ReturnType<typeof setInterval> | null = $state(null);
	let submitError: string = $state('');

	// Derived
	let columnOptions = $derived(columns.map(c => ({ value: c, label: c })));
	let mappingValid = $derived(
		emailColumn &&
		(splitName ? (firstNameColumn || lastNameColumn) : true) &&
		selectedRole
	);

	let previewName = $derived.by(() => {
		if (!previewRows.length) return ['', ''];
		return previewRows.map(row => {
			if (splitName) {
				const parts = [];
				if (firstNameColumn && row[firstNameColumn]) parts.push(row[firstNameColumn]);
				if (lastNameColumn && row[lastNameColumn]) parts.push(row[lastNameColumn]);
				return parts.join(' ');
			}
			return nameColumn ? (row[nameColumn] || '') : '';
		});
	});

	let previewEmail = $derived.by(() => {
		if (!previewRows.length || !emailColumn) return ['', ''];
		return previewRows.map(row => row[emailColumn] || '');
	});

	async function handleFileSelect() {
		const file = fileInput?.files?.[0];
		if (!file) return;
		selectedFile = file;
		parseError = '';
		parsing = true;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch(`${ORIGIN}/api/v2/batch-invitees/parse`, {
				method: 'POST',
				credentials: 'include',
				body: formData
			});

			if (!response.ok) {
				const err = await response.json();
				parseError = err.detail || `Error ${response.status}`;
				return;
			}

			const result = await response.json();
			columns = result.columns;
			previewRows = result.preview_rows;
			step = 'mapping';
		} catch (e: any) {
			parseError = e.message;
		} finally {
			parsing = false;
		}
	}

	async function handleSubmit() {
		if (!selectedFile || !mappingValid) return;
		submitError = '';

		const mapping: Record<string, string | null> = {
			email_column: emailColumn
		};
		if (splitName) {
			mapping.first_name_column = firstNameColumn || null;
			mapping.last_name_column = lastNameColumn || null;
		} else {
			mapping.name_column = nameColumn || null;
		}

		const formData = new FormData();
		formData.append('file', selectedFile);
		formData.append('mapping_json', JSON.stringify(mapping));
		formData.append('role', selectedRole!.value);
		formData.append('send_emails', String(sendEmails));

		try {
			const response = await fetch(`${ORIGIN}/api/v2/batch-invitees/create`, {
				method: 'POST',
				credentials: 'include',
				body: formData
			});

			if (!response.ok) {
				const err = await response.json();
				submitError = err.detail || `Error ${response.status}`;
				return;
			}

			const result = await response.json();
			jobUid = result.job_uid;
			step = 'processing';
			startPolling();
		} catch (e: any) {
			submitError = e.message;
		}
	}

	function startPolling() {
		pollInterval = setInterval(async () => {
			try {
				const response = await fetch(
					`${ORIGIN}/api/v2/batch-invitees/${jobUid}/progress`,
					{ credentials: 'include' }
				);
				if (!response.ok) return;
				const data = await response.json();
				progress = data;

				if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'failed') {
					stopPolling();
					await loadSummary();
					step = 'done';
				}
			} catch {
				// retry on next interval
			}
		}, 1000);
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	async function loadSummary() {
		try {
			const response = await fetch(
				`${ORIGIN}/api/v2/batch-invitees/${jobUid}`,
				{ credentials: 'include' }
			);
			if (response.ok) {
				const data = await response.json();
				summary = data.summary || [];
				progress = {
					status: data.status,
					total_rows: data.total_rows,
					processed_rows: data.processed_rows,
					successful_count: data.successful_count,
					failed_count: data.failed_count,
					skipped_duplicate_email_count: data.skipped_duplicate_email_count,
					skipped_active_user_count: data.skipped_active_user_count,
					failed_email_count: data.failed_email_count,
					percentage: data.percentage
				};
			}
		} catch {
			// ignore
		}
	}

	async function handleCancel() {
		try {
			await fetch(`${ORIGIN}/api/v2/batch-invitees/${jobUid}/cancel`, {
				method: 'POST',
				credentials: 'include'
			});
		} catch {
			// ignore
		}
	}

	function statusBadgeClass(status: string): string {
		switch (status) {
			case 'created': return 'badge variant-filled-success';
			case 'warning_name_match': return 'badge variant-filled-warning';
			case 'skipped_duplicate_email':
			case 'skipped_active_user': return 'badge variant-filled-surface';
			case 'failed': return 'badge variant-filled-error';
			default: return 'badge variant-filled-surface';
		}
	}

	function statusLabel(status: string): string {
		switch (status) {
			case 'created': return m.BATCH_INVITEE_CREATED();
			case 'warning_name_match': return m.BATCH_INVITEE_WARNING_NAME();
			case 'skipped_duplicate_email': return m.BATCH_INVITEE_SKIPPED_DUPLICATE();
			case 'skipped_active_user': return m.BATCH_INVITEE_SKIPPED_ACTIVE();
			case 'failed': return m.BATCH_INVITEE_FAILED();
			default: return status;
		}
	}
</script>

<div class="container mx-auto p-4 max-w-3xl">
	<!-- Header -->
	<header class="mb-6">
		<div class="flex items-center justify-between mb-4">
			<a href="/web/invite/invitees" class="btn btn-sm variant-ghost">
				<Fa icon={faArrowLeft} class="mr-2" />
				{m.BATCH_INVITEE_BACK()}
			</a>
			<a href="/web/invite/batch-logs" class="btn btn-sm variant-ghost-surface">
				<Fa icon={faClockRotateLeft} class="mr-2" />
				{m.BATCH_INVITEE_LOGS()}
			</a>
		</div>
		<h1 class="h2 mb-2">{m.BATCH_INVITEE_TITLE()}</h1>
		<p class="text-surface-600">{m.BATCH_INVITEE_SUBTITLE()}</p>
	</header>

	<!-- Step 1: Upload -->
	{#if step === 'upload'}
		<div class="card p-6">
			<p class="text-sm text-surface-500 mb-4">{m.BATCH_INVITEE_SUPPORTED_FORMATS()}</p>

			<input
				type="file"
				accept=".xlsx,.csv,.ods"
				bind:this={fileInput}
				onchange={handleFileSelect}
				class="hidden"
			/>

			<button
				class="btn variant-filled-primary"
				onclick={() => fileInput?.click()}
				disabled={parsing}
			>
				{#if parsing}
					<Fa icon={faSpinner} class="mr-2 animate-spin" />
					{m.BATCH_INVITEE_PROCESSING()}
				{:else}
					<Fa icon={faUpload} class="mr-2" />
					{m.BATCH_INVITEE_SELECT_FILE()}
				{/if}
			</button>

			{#if parseError}
				<aside class="alert variant-filled-error mt-4">
					<p>{parseError}</p>
				</aside>
			{/if}
		</div>
	{/if}

	<!-- Step 2: Column mapping + preview -->
	{#if step === 'mapping'}
		<div class="card p-6 space-y-6">
			<!-- File info -->
			<div class="flex items-center justify-between">
				<p class="font-semibold">{selectedFile?.name}</p>
				<button
					class="btn btn-sm variant-ghost"
					onclick={() => { step = 'upload'; columns = []; previewRows = []; }}
				>
					{m.BATCH_INVITEE_CHANGE_FILE()}
				</button>
			</div>

			<hr />

			<!-- Column mapping -->
			<h3 class="h3">{m.BATCH_INVITEE_COLUMN_MAPPING()}</h3>

			<div class="grid grid-cols-1 gap-4">
				<!-- Email column -->
				<label class="label">
					<span>{m.BATCH_INVITEE_EMAIL_COLUMN()} *</span>
					<Select
						items={columnOptions}
						bind:value={emailColumnSel}
						placeholder={m.BATCH_INVITEE_SELECT_COLUMN()}
					><NoOptions slot="empty" /></Select>
				</label>

				<!-- Name split toggle -->
				<label class="flex items-center gap-3">
					<input type="checkbox" class="checkbox" bind:checked={splitName} />
					<span>{m.BATCH_INVITEE_NAME_SPLIT()}</span>
				</label>

				{#if splitName}
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<label class="label">
							<span>{m.BATCH_INVITEE_FIRST_NAME_COLUMN()}</span>
							<Select
								items={columnOptions}
								bind:value={firstNameColumnSel}
								placeholder={m.BATCH_INVITEE_NO_COLUMN()}
							><NoOptions slot="empty" /></Select>
						</label>
						<label class="label">
							<span>{m.BATCH_INVITEE_LAST_NAME_COLUMN()}</span>
							<Select
								items={columnOptions}
								bind:value={lastNameColumnSel}
								placeholder={m.BATCH_INVITEE_NO_COLUMN()}
							><NoOptions slot="empty" /></Select>
						</label>
					</div>
				{:else}
					<label class="label">
						<span>{m.BATCH_INVITEE_NAME_COLUMN()}</span>
						<Select
							items={columnOptions}
							bind:value={nameColumnSel}
							placeholder={m.BATCH_INVITEE_NO_COLUMN()}
						><NoOptions slot="empty" /></Select>
					</label>
				{/if}
			</div>

			<!-- Live preview -->
			{#if emailColumn && previewRows.length > 0}
				<hr />
				<h3 class="h3">{m.BATCH_INVITEE_PREVIEW()}</h3>
				<div class="table-container">
					<table class="table table-compact">
						<thead>
							<tr>
								<th>{m.INVITEE_COL_NAME()}</th>
								<th>{m.INVITEE_COL_EMAIL()}</th>
							</tr>
						</thead>
						<tbody>
							{#each previewRows as _, i}
								<tr>
									<td>{previewName[i] || '—'}</td>
									<td>{previewEmail[i] || '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<hr />

			<!-- Role -->
			<label class="label">
				<span>{m.BATCH_INVITEE_ROLE()} *</span>
				<Select
					items={getRoleOptions()}
					bind:value={selectedRole}
					placeholder={m.BATCH_INVITEE_ROLE()}
				><NoOptions slot="empty" /></Select>
			</label>

			<!-- Send emails -->
			<label class="flex items-center gap-3">
				<input type="checkbox" class="checkbox" bind:checked={sendEmails} />
				<span>{m.BATCH_INVITEE_SEND_EMAILS()}</span>
			</label>

			{#if submitError}
				<aside class="alert variant-filled-error">
					<p>{submitError}</p>
				</aside>
			{/if}

			<!-- Actions -->
			<div class="flex gap-4 justify-end">
				<button
					class="btn variant-ghost"
					onclick={() => goto('/web/invite/invitees')}
				>
					{m.BATCH_INVITEE_CANCEL()}
				</button>
				<button
					class="btn variant-filled-primary"
					disabled={!mappingValid}
					onclick={handleSubmit}
				>
					{m.BATCH_INVITEE_CONFIRM()}
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 3: Processing -->
	{#if step === 'processing'}
		<div class="card p-6 space-y-6">
			<h3 class="h3">
				<Fa icon={faSpinner} class="mr-2 animate-spin inline" />
				{m.BATCH_INVITEE_PROCESSING()}
			</h3>

			<!-- Progress bar -->
			<div>
				<div class="flex justify-between text-sm mb-1">
					<span>{m.BATCH_INVITEE_PROGRESS()}</span>
					<span>{progress.processed_rows} / {progress.total_rows} ({progress.percentage}%)</span>
				</div>
				<div class="w-full bg-surface-300 rounded-full h-4">
					<div
						class="bg-primary-500 h-4 rounded-full transition-all duration-300"
						style="width: {progress.percentage}%"
					></div>
				</div>
			</div>

			<!-- Live counters -->
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
				<div class="card p-3 text-center variant-soft-success">
					<p class="text-2xl font-bold">{progress.successful_count}</p>
					<p class="text-sm">{m.BATCH_INVITEE_CREATED()}</p>
				</div>
				<div class="card p-3 text-center variant-soft-error">
					<p class="text-2xl font-bold">{progress.failed_count}</p>
					<p class="text-sm">{m.BATCH_INVITEE_FAILED()}</p>
				</div>
				<div class="card p-3 text-center variant-soft-surface">
					<p class="text-2xl font-bold">{progress.skipped_duplicate_email_count}</p>
					<p class="text-sm">{m.BATCH_INVITEE_SKIPPED_DUPLICATE()}</p>
				</div>
				<div class="card p-3 text-center variant-soft-surface">
					<p class="text-2xl font-bold">{progress.skipped_active_user_count}</p>
					<p class="text-sm">{m.BATCH_INVITEE_SKIPPED_ACTIVE()}</p>
				</div>
				{#if progress.failed_email_count > 0}
					<div class="card p-3 text-center variant-soft-warning">
						<p class="text-2xl font-bold">{progress.failed_email_count}</p>
						<p class="text-sm">{m.BATCH_INVITEE_EMAIL_ERRORS()}</p>
					</div>
				{/if}
			</div>

			<div class="flex justify-end">
				<button class="btn variant-filled-error" onclick={handleCancel}>
					<Fa icon={faBan} class="mr-2" />
					{m.BATCH_INVITEE_CANCEL_JOB()}
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 4: Done -->
	{#if step === 'done'}
		<div class="card p-6 space-y-6">
			<!-- Status header -->
			{#if progress.status === 'completed'}
				<h3 class="h3 text-success-500">
					<Fa icon={faCheck} class="mr-2 inline" />
					{m.BATCH_INVITEE_COMPLETED()}
				</h3>
			{:else if progress.status === 'cancelled'}
				<h3 class="h3 text-warning-500">
					<Fa icon={faBan} class="mr-2 inline" />
					{m.BATCH_INVITEE_CANCELLED()}
				</h3>
			{:else}
				<h3 class="h3 text-error-500">
					<Fa icon={faXmark} class="mr-2 inline" />
					{m.BATCH_INVITEE_FAILED()}
				</h3>
			{/if}

			<!-- Final counters -->
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
				<div class="card p-3 text-center variant-soft-success">
					<p class="text-2xl font-bold">{progress.successful_count}</p>
					<p class="text-sm">{m.BATCH_INVITEE_CREATED()}</p>
				</div>
				<div class="card p-3 text-center variant-soft-error">
					<p class="text-2xl font-bold">{progress.failed_count}</p>
					<p class="text-sm">{m.BATCH_INVITEE_FAILED()}</p>
				</div>
				<div class="card p-3 text-center variant-soft-surface">
					<p class="text-2xl font-bold">{progress.skipped_duplicate_email_count}</p>
					<p class="text-sm">{m.BATCH_INVITEE_SKIPPED_DUPLICATE()}</p>
				</div>
				<div class="card p-3 text-center variant-soft-surface">
					<p class="text-2xl font-bold">{progress.skipped_active_user_count}</p>
					<p class="text-sm">{m.BATCH_INVITEE_SKIPPED_ACTIVE()}</p>
				</div>
				{#if progress.failed_email_count > 0}
					<div class="card p-3 text-center variant-soft-warning">
						<p class="text-2xl font-bold">{progress.failed_email_count}</p>
						<p class="text-sm">{m.BATCH_INVITEE_EMAIL_ERRORS()}</p>
					</div>
				{/if}
			</div>

			<!-- Summary table -->
			{#if summary.length > 0}
				<h3 class="h3">{m.BATCH_INVITEE_SUMMARY()}</h3>
				<div class="table-container">
					<table class="table table-compact">
						<thead>
							<tr>
								<th>{m.BATCH_INVITEE_ROW()}</th>
								<th>{m.INVITEE_COL_NAME()}</th>
								<th>{m.INVITEE_COL_EMAIL()}</th>
								<th>{m.BATCH_INVITEE_STATUS()}</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each summary as row}
								<tr>
									<td>{row.row}</td>
									<td>{row.name || '—'}</td>
									<td>{row.email}</td>
									<td>
										<span class={statusBadgeClass(row.status)}>
											{statusLabel(row.status)}
										</span>
										{#if row.email_error}
											<span class="badge variant-filled-warning ml-1" title={m.BATCH_INVITEE_EMAIL_ERRORS()}>
												<Fa icon={faExclamationTriangle} />
											</span>
										{/if}
									</td>
									<td>
										{#if row.existing_invitee_uid}
											<a
												href="/web/invite/invitees/{row.existing_invitee_uid}"
												target="_blank"
												rel="noopener noreferrer"
												class="btn btn-sm variant-ghost-warning"
												title={m.BATCH_INVITEE_VIEW_EXISTING()}
											>
												<Fa icon={faExternalLinkAlt} />
											</a>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex gap-4 justify-end">
				<a href="/web/invite/invitees" class="btn variant-filled-primary">
					{m.BATCH_INVITEE_VIEW_INVITEES()}
				</a>
			</div>
		</div>
	{/if}
</div>
