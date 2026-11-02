<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
	import Fa from 'svelte-fa';
	import { faPlus, faTrashCan, faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { createCommand, putCommand, deleteCommand } from '../../schedule.remote';
	import type { IsoDay, Period } from './openingHours.ts';
	import {
		ISO_DAYS,
		emptyDays,
		toDraft,
		toPayload,
		type ApiSchedule,
		type Channel,
		type ScheduleDraft
	} from './scheduleApi.ts';
	import {
		DAY_NAMES,
		applyToDays,
		draftError,
		nextPeriod,
		periodsError,
		sharedPeriods,
		shortcutDays
	} from './scheduleEditor.ts';

	let { entryUid }: { entryUid: string } = $props();

	const CHANNELS: { value: Channel; label: string }[] = [
		{ value: 'on_site', label: 'Sur place' },
		{ value: 'phone', label: 'Par téléphone' },
		{ value: 'sms', label: 'Par SMS' },
		{ value: 'online', label: 'En ligne' }
	];

	const blank = (): ScheduleDraft => ({ channel: 'on_site', label: '', holidays: 'closed', days: emptyDays() });

	let dialog: HTMLDialogElement | undefined = $state();
	let draft: ScheduleDraft = $state(blank());
	let initial = $state(JSON.stringify(blank()));
	let editingUid: string | null = $state(null);
	let selected: IsoDay[] = $state([1]);
	let rows: Period[] = $state([]);
	let mixed = $state(false);
	let confirmDelete = $state(false);
	let result: { success: boolean; text: string } | undefined = $state();
	let busy = $state(false);

	const error = $derived(draftError(draft.days));
	const changed = $derived(JSON.stringify(draft) !== initial);
	const disabled = $derived(busy || !changed || !!error || result?.success === true);
	const rowsError = $derived(periodsError(rows));

	const select = (days: IsoDay[]) => {
		selected = days;
		const shared = sharedPeriods(draft.days, days);
		mixed = shared === null;
		rows = shared ?? [];
	};

	const setRows = (next: Period[]) => {
		rows = next;
		mixed = false;
		draft.days = applyToDays(draft.days, selected, next);
	};

	const toggleDay = (day: IsoDay) => {
		const next = selected.includes(day) ? selected.filter((d) => d !== day) : [...selected, day].sort();
		select(next as IsoDay[]);
	};

	const addRow = () => {
		const period = nextPeriod(rows);
		if (period) setRows([...rows, period]);
	};

	const removeRow = (index: number) => setRows(rows.filter((_, i) => i !== index));

	const editRow = (index: number, field: 'opens' | 'closes', value: string) => {
		const stored = field === 'closes' && value === '00:00' ? '24:00' : value;
		setRows(rows.map((period, i) => (i === index ? { ...period, [field]: stored } : period)));
	};

	const hasHours = (day: IsoDay) => draft.days[day].length > 0;

	export function open(schedule?: ApiSchedule) {
		editingUid = schedule?.uid ?? null;
		draft = schedule ? toDraft(schedule) : blank();
		initial = JSON.stringify(draft);
		result = undefined;
		confirmDelete = false;
		select([ISO_DAYS.find(hasHours) ?? 1]);
		dialog?.showModal();
	}

	async function save() {
		busy = true;
		try {
			const payload = toPayload(entryUid, draft);
			result = editingUid
				? await putCommand({ uid: editingUid, ...payload })
				: await createCommand(payload);
			if (result?.success) {
				await invalidate('entry:now');
				dialog?.close();
			}
		} catch (e) {
			console.error(e);
			result = { success: false, text: 'Une erreur est survenue.' };
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!editingUid) return;
		busy = true;
		try {
			result = await deleteCommand({ uid: editingUid });
			if (result?.success) {
				await invalidate('entry:now');
				dialog?.close();
			}
		} catch (e) {
			console.error(e);
			result = { success: false, text: 'Une erreur est survenue.' };
		} finally {
			busy = false;
		}
	}
</script>

<Dialog bind:dialog>
	<div class="w-[92vw] sm:w-[38rem] p-4 space-y-4" data-testid="schedule-editor">
		<h3 class="h3">Horaires</h3>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<label class="label">
				<span>Canal</span>
				<select class="select min-h-[44px]" bind:value={draft.channel}>
					{#each CHANNELS as channel (channel.value)}
						<option value={channel.value}>{channel.label}</option>
					{/each}
				</select>
			</label>
			<label class="label">
				<span>Intitulé (facultatif)</span>
				<input class="input min-h-[44px]" type="text" maxlength="100" bind:value={draft.label} />
			</label>
		</div>

		<div>
			<p class="mb-2">Jours</p>
			<div class="flex flex-wrap gap-2" role="group" aria-label="Jours de la semaine">
				{#each ISO_DAYS as day (day)}
					<button
						type="button"
						class="btn min-h-[44px] rounded-full {selected.includes(day)
							? 'variant-filled-primary'
							: 'variant-ghost-surface'}"
						aria-pressed={selected.includes(day)}
						onclick={() => toggleDay(day)}
					>
						{DAY_NAMES[day][0].toUpperCase()}{DAY_NAMES[day].slice(1)}{hasHours(day) ? ' ●' : ''}
					</button>
				{/each}
			</div>
			<div class="flex flex-wrap gap-2 mt-2">
				<button type="button" class="btn variant-ghost-surface min-h-[44px]" onclick={() => select(shortcutDays('weekdays'))}>Lun–Ven</button>
				<button type="button" class="btn variant-ghost-surface min-h-[44px]" onclick={() => select(shortcutDays('everyday'))}>7j/7</button>
				<button
					type="button"
					class="btn variant-ghost-surface min-h-[44px]"
					onclick={() => setRows([{ opens: '00:00', closes: '24:00' }])}>24h/24</button
				>
			</div>
		</div>

		<div class="space-y-2">
			{#if selected.length === 0}
				<p>Choisissez un ou plusieurs jours.</p>
			{:else}
				{#if mixed}
					<p class="variant-soft-warning p-2 rounded-token">
						Ces jours ont des horaires différents. Ce que vous saisissez les remplace tous.
					</p>
				{/if}
				{#if rows.length === 0}
					<p>Fermé {selected.length > 1 ? 'ces jours' : 'ce jour'}. Ajoutez une plage pour l’ouvrir.</p>
				{/if}
				{#each rows as period, index (index)}
					<div class="flex flex-wrap items-center gap-2" data-testid="schedule-row">
						<button
							type="button"
							class="btn-icon variant-ghost-surface min-h-[44px] min-w-[44px]"
							title="Supprimer la plage"
							onclick={() => removeRow(index)}><Fa icon={faTrashCan} /></button
						>
						<label class="flex items-center gap-2">
							<span>De</span>
							<input
								class="input min-h-[44px] w-32"
								type="time"
								value={period.opens}
								onchange={(e) => editRow(index, 'opens', e.currentTarget.value)}
							/>
						</label>
						<label class="flex items-center gap-2">
							<span>à</span>
							<input
								class="input min-h-[44px] w-32"
								type="time"
								value={period.closes === '24:00' ? '00:00' : period.closes}
								onchange={(e) => editRow(index, 'closes', e.currentTarget.value)}
							/>
						</label>
					</div>
				{/each}
				<button
					type="button"
					class="btn variant-ghost-surface min-h-[44px]"
					disabled={!nextPeriod(rows)}
					onclick={addRow}><span><Fa icon={faPlus} /></span><span>Ajouter une plage</span></button
				>
				{#if rowsError}<p class="text-error-500">{rowsError}</p>{/if}
			{/if}
		</div>

		<div>
			<p class="mb-2" id="holidays-label">Jours fériés</p>
			<RadioGroup
				padding="px-6 py-3"
				active="variant-filled-primary"
				hover="hover:variant-soft-primary"
				labelledby="holidays-label"
			>
				<RadioItem bind:group={draft.holidays} name="holidays" value="closed">Fermé</RadioItem>
				<RadioItem bind:group={draft.holidays} name="holidays" value="open">Ouvert</RadioItem>
			</RadioGroup>
		</div>

		{#if error}<p class="text-error-500">{error}</p>{/if}

		<div class="flex flex-wrap items-center gap-2">
			{#if result?.success}
				<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
			{:else if result}
				<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>{result.text}
			{/if}
			<div class="flex flex-wrap gap-2 ml-auto">
				{#if editingUid}
					{#if confirmDelete}
						<button type="button" class="btn variant-filled-error min-h-[44px]" disabled={busy} onclick={remove}>Confirmer la suppression</button>
					{:else}
						<button type="button" class="btn variant-ghost-error min-h-[44px]" onclick={() => (confirmDelete = true)}>Supprimer</button>
					{/if}
				{/if}
				<button type="button" class="btn variant-ghost-surface min-h-[44px]" onclick={() => dialog?.close()}>Annuler</button>
				<button type="button" class="btn variant-filled-secondary min-h-[44px]" {disabled} onclick={save}>Enregistrer</button>
			</div>
		</div>
	</div>
</Dialog>
