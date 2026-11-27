<script lang="ts">
	/**
	 * The condition selector and another directory selector, inside the real app
	 * shell, for tests/concern-select-touch.spec.ts.
	 *
	 * The real page is staff-only and its conditions come from one site's data;
	 * what the spec checks is how the selector behaves under a finger on a phone:
	 * where it scrolls to, whether its list stays open, whether the keyboard goes
	 * away. So the selector sits where it does on the directory, below a header,
	 * above a list long enough to scroll it to the top.
	 *
	 * Dev-only: +page.ts throws 404 outside `dev`, so this never answers in
	 * production.
	 */
	import { setSelectConcern } from '#lib/components/Directory/context.ts';
	import SelectConcern from '#lib/components/Directory/SelectConcern.svelte';
	import Select from '#lib/Web/Select.svelte';
	import type { Concern } from '#lib/store/concernTree.ts';

	setSelectConcern();

	const node = (
		uid: string,
		name: string,
		parent: string | null = null,
		kind: Concern['kind'] = 'condition'
	): Concern => ({ uid, slug: uid, name, kind, parent, synonyms: [], entries: ['e'], see_also: [] });

	const concerns: Concern[] = [
		node('c-add', 'Troubles liés à une substance et troubles addictifs', null, 'chapter'),
		node('c-alc', 'Addiction alcool', 'c-add'),
		node('c-can', 'Addiction cannabis', 'c-add'),
		node('c-jeu', 'Addiction aux jeux', 'c-add'),
		node('c-tca', "Troubles des conduites alimentaires et de l'ingestion d'aliments", null, 'chapter'),
		node('c-arf', 'ARFID', 'c-tca'),
		node('c-pic', 'Pica', 'c-tca'),
		node('c-sch', 'Spectre de la schizophrénie et autres troubles psychotiques', null, 'chapter'),
		node('s-cri', 'Crise suicidaire', null, 'situation'),
		node('s-har', 'Harcèlement', null, 'situation'),
		node('s-deu', 'Deuil', null, 'situation')
	];

	// A short list near the top, which fits above the keyboard where it is.
	const departments = [
		{ value: '69', label: 'Rhône' },
		{ value: '84', label: 'Vaucluse' }
	];

	// A short list low on the screen, as the facility selector once a condition is picked.
	const facilities = ['CMP Lyon 3', 'Maison des adolescents', 'Centre de santé'].map((label) => ({
		value: label,
		label
	}));

	// Another directory selector below it, as the type selector sits on the directory.
	const types = ['Psychiatre', 'Psychologue', 'Infirmier', 'Médecin généraliste', 'Addictologue'].map(
		(label) => ({ value: label.toLowerCase(), label })
	);
</script>

<div class="mx-auto w-full max-w-7xl p-4">
	<h2 class="h2 py-8">Annuaire santé mentale</h2>
	<div class="department-select svelte-select mb-2">
		<Select fitOnPhone={true} items={departments} placeholder="Département..." />
	</div>
	<p class="h-[40vh]">Fixture: the selector sits below this block, as on the directory.</p>
	<SelectConcern {concerns} />
	<div class="type-select svelte-select mt-2">
		<Select fitOnPhone={true} items={types} placeholder="Type de professionnel..." />
	</div>
	<div class="facility-select svelte-select mt-2">
		<Select fitOnPhone={true} items={facilities} placeholder="Lieu..." />
	</div>
	<ul data-testid="filler">
		{#each Array.from({ length: 40 }, (_, i) => i) as i (i)}
			<li class="py-6">Entry {i + 1}</li>
		{/each}
	</ul>
</div>
