<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import {
		faBed,
		faChalkboardUser,
		faCheck,
		faClipboardCheck,
		faComments,
		faDiagramProject,
		faEarListen,
		faGraduationCap,
		faHandHoldingHeart,
		faHandHoldingHand,
		faCircleInfo,
		faPenToSquare,
		faPeopleGroup,
		faScaleBalanced,
		faShieldHeart,
		faSignsPost,
		faSun,
		faUserDoctor,
		faVial,
		type IconDefinition
	} from '@fortawesome/free-solid-svg-icons';
	import { invalidate } from '$app/navigation';
	import Dialog from '#lib/Web/Dialog.svelte';
	import { patchCommand } from '../../../entry.remote';
	import { OFFERS, type EntryFacets } from '#lib/store/directoryStoreInterface.ts';

	/**
	 * What the entry offers the person who comes, as short chips with an icon; in edit mode,
	 * a dialog of the whole vocabulary saved through the entry's PATCH (the backend's rule).
	 */
	let {
		offers,
		entryUid = undefined,
		editMode = false
	}: { offers: EntryFacets['offers'] | undefined; entryUid?: string; editMode?: boolean } = $props();

	const OFFER: Record<(typeof OFFERS)[number], { label: () => string; icon: IconDefinition }> = {
		listening: { label: m.DIRECTORY_OFFER_LISTENING, icon: faEarListen },
		information: { label: m.DIRECTORY_OFFER_INFORMATION, icon: faCircleInfo },
		orientation: { label: m.DIRECTORY_OFFER_ORIENTATION, icon: faSignsPost },
		accompaniment: { label: m.DIRECTORY_OFFER_ACCOMPANIMENT, icon: faHandHoldingHand },
		peer_support: { label: m.DIRECTORY_OFFER_PEER_SUPPORT, icon: faPeopleGroup },
		support_group: { label: m.DIRECTORY_OFFER_SUPPORT_GROUP, icon: faComments },
		training: { label: m.DIRECTORY_OFFER_TRAINING, icon: faGraduationCap },
		advocacy: { label: m.DIRECTORY_OFFER_ADVOCACY, icon: faScaleBalanced },
		consultation: { label: m.DIRECTORY_OFFER_CONSULTATION, icon: faUserDoctor },
		assessment: { label: m.DIRECTORY_OFFER_ASSESSMENT, icon: faClipboardCheck },
		psychotherapy: { label: m.DIRECTORY_OFFER_PSYCHOTHERAPY, icon: faHandHoldingHeart },
		full_time_hospitalisation: { label: m.DIRECTORY_OFFER_FULL_TIME_HOSPITALISATION, icon: faBed },
		day_hospitalisation: { label: m.DIRECTORY_OFFER_DAY_HOSPITALISATION, icon: faSun },
		coordination: { label: m.DIRECTORY_OFFER_COORDINATION, icon: faDiagramProject },
		harm_reduction: { label: m.DIRECTORY_OFFER_HARM_REDUCTION, icon: faShieldHeart },
		screening: { label: m.DIRECTORY_OFFER_SCREENING, icon: faVial },
		therapeutic_education: { label: m.DIRECTORY_OFFER_THERAPEUTIC_EDUCATION, icon: faChalkboardUser }
	};

	const shown = $derived(OFFERS.filter((offer) => offers?.includes(offer)));

	let dialog: HTMLDialogElement | undefined = $state();
	let ticked: string[] = $state([]);
	let busy = $state(false);
	let saved = $state(false);
	let refusal: string | undefined = $state();
	const chosen = $derived(OFFERS.filter((offer) => ticked.includes(offer)));
	const canSave = $derived(!busy && chosen.join() !== shown.join());

	function open() {
		ticked = [...shown];
		saved = false;
		refusal = undefined;
		dialog?.showModal();
	}

	async function save() {
		if (!canSave || !entryUid) return;
		busy = true;
		refusal = undefined;
		try {
			const result = await patchCommand({ entry: entryUid, offers: chosen.length ? chosen : null });
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

{#if shown.length || editMode}
	<section aria-labelledby="entry-offers">
		<div class="flex items-center py-2">
			<div class="w-9"><Fa icon={faHandHoldingHeart} size="sm" /></div>
			<h4 class="h4 flex place-items-center gap-1" id="entry-offers">
				{m.DIRECTORY_ENTRY_OFFERS()}{#if editMode}<button
						type="button"
						class="btn-icon variant-ghost-surface min-h-11 min-w-11"
						title={m.ENTRY_OFFERS_EDIT()}
						aria-label={m.ENTRY_OFFERS_EDIT()}
						data-testid="entry-offers-edit"
						onclick={open}><Fa icon={faPenToSquare} /></button
					>{/if}
			</h4>
		</div>
		{#if shown.length}<div class="flex">
			<div class="w-9 flex-none"></div>
			<ul class="flex flex-wrap gap-2 py-2" aria-labelledby="entry-offers">
				{#each shown as offer (offer)}
					<li class="rounded-token variant-ringed-primary text-primary-800-100-token px-3 py-1 text-base flex items-center gap-2">
						<Fa icon={OFFER[offer].icon} size="sm" />{OFFER[offer].label()}
					</li>
				{/each}
			</ul>
		</div>{/if}
	</section>
{/if}

{#if editMode}
	<Dialog bind:dialog classProp="w-[90vw] sm:w-[40rem]">
		<div class="p-6 space-y-4 text-base" data-testid="entry-offers-dialog">
			<h2 class="h3">{m.ENTRY_OFFERS_TITLE()}</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
				{#each OFFERS as offer (offer)}
					<label class="flex items-center gap-3 min-h-11 px-2 rounded-token cursor-pointer">
						<input class="checkbox" type="checkbox" value={offer} bind:group={ticked} />
						<Fa icon={OFFER[offer].icon} size="sm" />
						<span>{OFFER[offer].label()}</span>
					</label>
				{/each}
			</div>
			{#if refusal}
				<p class="text-error-700-200-token" data-testid="entry-offers-refusal">{refusal}</p>
			{/if}
			<div class="flex flex-wrap items-center justify-end gap-2">
				{#if saved}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					<span>{m.ENTRY_OFFERS_SAVED()}</span>
				{/if}
				<button type="button" class="btn min-h-11 variant-ringed-surface text-surface-900-50-token" onclick={() => dialog?.close()} disabled={busy}>
					{m.CANCEL()}
				</button>
				<button type="button" class="btn min-h-11 variant-filled-primary" disabled={!canSave} onclick={save} data-testid="entry-offers-save">
					{m.ENTRY_OFFERS_SAVE()}
				</button>
			</div>
		</div>
	</Dialog>
{/if}
