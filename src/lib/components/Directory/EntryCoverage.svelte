<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck, faEarthEurope, faPenToSquare, faXmark } from '@fortawesome/free-solid-svg-icons';
	import { invalidate } from '$app/navigation';
	import Dialog from '#lib/Web/Dialog.svelte';
	import { patchCommand, searchPlaces } from '../../../entry.remote';
	import type { Coverage } from '#lib/store/directoryStoreInterface.ts';

	/**
	 * Where an entry without premises answers, shown in place of an address; in edit mode, a
	 * dialog to add places of any kind, found by name or code, and to remove them, saved
	 * through the entry's PATCH (the backend's rule).
	 */
	let {
		coverage = [],
		entryUid = undefined,
		editMode = false
	}: { coverage?: Coverage[]; entryUid?: string; editMode?: boolean } = $props();

	const KIND: Record<Coverage['kind'], () => string> = {
		country: m.COVERAGE_KIND_COUNTRY,
		region: m.COVERAGE_KIND_REGION,
		department: m.COVERAGE_KIND_DEPARTMENT,
		commune: m.COVERAGE_KIND_COMMUNE
	};

	/** « Rhône (69) », « Saint-Maurice (94) »: the code a reader tells places apart by. */
	function placeName(place: Coverage): string {
		const code = place.kind === 'commune' ? place.department : place.kind === 'department' ? place.code : null;
		return code ? `${place.name} (${code})` : (place.name ?? '');
	}

	let dialog: HTMLDialogElement | undefined = $state();
	let searchBox: HTMLInputElement | undefined = $state();
	let chosen: Coverage[] = $state([]);
	let typed = $state('');
	let found: Coverage[] = $state([]);
	let searched = $state(false);
	let busy = $state(false);
	let saved = $state(false);
	let refusal: string | undefined = $state();
	const uids = (places: Coverage[]) => places.map((place) => place.uid);
	const canSave = $derived(!busy && uids(chosen).join() !== uids(coverage).join());
	const offered = $derived(found.filter((place) => !chosen.some((c) => c.uid === place.uid)));

	function open() {
		chosen = [...coverage];
		typed = '';
		found = [];
		searched = false;
		saved = false;
		refusal = undefined;
		dialog?.showModal();
	}

	// The last search asked wins: an earlier, slower answer must not replace it.
	let asked = 0;
	let pause: ReturnType<typeof setTimeout> | undefined;

	function onTyped() {
		clearTimeout(pause);
		pause = setTimeout(find, 250);
	}

	async function find() {
		const ask = ++asked;
		const q = typed.trim();
		if (q.length < 2) {
			found = [];
			searched = false;
			return;
		}
		let places: Coverage[] = [];
		try {
			places = await searchPlaces(q);
		} catch {
			places = [];
		}
		if (ask !== asked) return;
		found = places;
		searched = true;
	}

	function add(place: Coverage) {
		chosen = [...chosen, place];
		typed = '';
		found = [];
		searched = false;
		searchBox?.focus();
	}

	function remove(place: Coverage) {
		chosen = chosen.filter((c) => c.uid !== place.uid);
	}

	async function save() {
		if (!canSave || !entryUid) return;
		busy = true;
		refusal = undefined;
		try {
			const result = await patchCommand({ entry: entryUid, coverage: uids(chosen) });
			if (result.success) {
				saved = true;
				await invalidate('entry:now');
				dialog?.close();
			} else {
				refusal = result.status === 403 ? m.ENTRY_DESCRIPTION_ERROR_NOT_ALLOWED() : m.ENTRY_DESCRIPTION_ERROR_FAILED();
			}
		} catch {
			refusal = m.ENTRY_DESCRIPTION_ERROR_FAILED();
		} finally {
			busy = false;
		}
	}
</script>

{#if coverage.length || editMode}
	<section class="px-2" aria-labelledby="entry-coverage">
		<div class="flex items-center p-1">
			<div class="w-9"><Fa icon={faEarthEurope} size="sm" /></div>
			<h4 class="h4 flex place-items-center gap-1" id="entry-coverage">
				{m.DIRECTORY_ENTRY_COVERAGE()}{#if editMode}<button
						type="button"
						class="btn-icon variant-ghost-surface min-h-11 min-w-11"
						title={m.ENTRY_COVERAGE_EDIT()}
						aria-label={m.ENTRY_COVERAGE_EDIT()}
						data-testid="entry-coverage-edit"
						onclick={open}><Fa icon={faPenToSquare} /></button
					>{/if}
			</h4>
		</div>
		{#if coverage.length}
			<ul class="flex flex-wrap gap-2 p-1" aria-labelledby="entry-coverage">
				{#each coverage as place (place.uid)}
					<li class="rounded-token variant-soft px-3 py-1 text-base">{placeName(place)}</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

{#if editMode}
	<Dialog bind:dialog classProp="w-[90vw] sm:w-[40rem]">
		<div class="p-6 space-y-4 text-base" data-testid="entry-coverage-dialog">
			<h2 class="h3">{m.DIRECTORY_ENTRY_COVERAGE()}</h2>
			{#if chosen.length}
				<ul class="flex flex-wrap gap-2">
					{#each chosen as place (place.uid)}
						<li class="rounded-token variant-soft flex items-center gap-1 pl-3">
							<span>{placeName(place)}</span>
							<button
								type="button"
								class="btn-icon min-h-11 min-w-11"
								aria-label={m.ENTRY_COVERAGE_REMOVE({ name: placeName(place) })}
								title={m.ENTRY_COVERAGE_REMOVE({ name: placeName(place) })}
								onclick={() => remove(place)}><Fa icon={faXmark} /></button
							>
						</li>
					{/each}
				</ul>
			{:else}
				<p>{m.ENTRY_COVERAGE_EMPTY()}</p>
			{/if}
			<label class="label">
				<span>{m.ENTRY_COVERAGE_SEARCH()}</span>
				<input
					class="input min-h-11"
					type="search"
					autocomplete="off"
					bind:this={searchBox}
					bind:value={typed}
					oninput={onTyped}
				/>
			</label>
			{#if offered.length}
				<ul class="space-y-1" data-testid="entry-coverage-found">
					{#each offered as place (place.uid)}
						<li>
							<button
								type="button"
								class="btn min-h-11 w-full justify-between variant-soft-surface text-left"
								onclick={() => add(place)}
								><span>{placeName(place)}</span> <span class="rounded-token variant-ringed-surface px-2"
									>{KIND[place.kind]()}</span
								></button
							>
						</li>
					{/each}
				</ul>
			{:else if searched}
				<p>{m.ENTRY_COVERAGE_NONE_FOUND()}</p>
			{/if}
			{#if refusal}
				<p class="text-error-700-200-token" data-testid="entry-coverage-refusal">{refusal}</p>
			{/if}
			<div class="flex flex-wrap items-center justify-end gap-2">
				{#if saved}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					<span>{m.ENTRY_COVERAGE_SAVED()}</span>
				{/if}
				<button
					type="button"
					class="btn min-h-11 variant-ringed-surface text-surface-900-50-token"
					onclick={() => dialog?.close()}
					disabled={busy}
				>
					{m.CANCEL()}
				</button>
				<button
					type="button"
					class="btn min-h-11 variant-filled-primary"
					disabled={!canSave}
					onclick={save}
					data-testid="entry-coverage-save"
				>
					{m.ENTRY_COVERAGE_SAVE()}
				</button>
			</div>
		</div>
	</Dialog>
{/if}
