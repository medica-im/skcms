<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { checkFacilitySlug } from '$src/facility.remote.ts';
	import { slugView, type SlugCheck } from '../Slug/slugView.ts';
	import SlugFeedback from '../Slug/SlugFeedback.svelte';

	let {
		name,
		commune,
		street,
		zip,
		effectorType = undefined,
		effector = undefined,
		original = null,
		exclude = null,
		slug = $bindable(''),
		ok = $bindable(false)
	}: {
		name: string;
		commune: string;
		street: string;
		zip: string;
		/** What names a facility with no name of its own: its occupation... */
		effectorType?: string;
		/** ...and its person (a service is named by its organisation). */
		effector?: string;
		/** The saved address of an existing facility; null while creating one. */
		original?: string | null;
		/** The facility being edited, which may keep its own address. */
		exclude?: string | null;
		slug?: string;
		ok?: boolean;
	} = $props();

	let check: SlugCheck | null = $state(null);
	let pending = $state(false);
	let failed = $state(false);
	/** Once the person has written the address, it is no longer generated. */
	let touched = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let latest = 0;

	let focused = $state(false);

	const view = $derived(slugView({ typed: slug, original, check, pending, failed, focused }));
	$effect(() => {
		ok = view.canConfirm;
	});

	async function ask(generate: boolean) {
		const id = ++latest;
		pending = true;
		failed = false;
		try {
			const answer = await checkFacilitySlug({
				name,
				commune,
				street,
				zip,
				effector_type: effectorType,
				effector,
				slug: generate ? undefined : slug,
				exclude: exclude ?? undefined
			});
			if (id !== latest) return;
			check = answer;
			if (generate && answer.slug) slug = answer.slug;
		} catch (e) {
			console.error(e);
			if (id === latest) failed = true;
		} finally {
			if (id === latest) pending = false;
		}
	}

	function later(generate: boolean, delay = 300) {
		clearTimeout(timer);
		pending = true;
		timer = setTimeout(() => ask(generate), delay);
	}

	// A new facility's address follows its name and its place until it is edited.
	$effect(() => {
		name;
		commune;
		street;
		zip;
		effectorType;
		effector;
		if (touched || original !== null || !street) return;
		untrack(() => later(true));
	});

	const typed = () => {
		touched = true;
		later(false);
	};
	const choose = (suggestion: string) => {
		slug = suggestion;
		touched = true;
		clearTimeout(timer);
		ask(false);
	};
	const regenerate = () => {
		touched = false;
		clearTimeout(timer);
		ask(true);
	};
</script>

<div class="space-y-2 w-full" data-testid="slug-field">
	<label class="label flex w-full flex-col items-start gap-1 place-self-start sm:flex-row sm:items-center sm:gap-2">
		<span class="shrink-0">Adresse web</span>
		<input
			class="input w-full min-h-[44px] {view.status === 'taken' || view.status === 'invalid' ? 'input-error' : ''}"
			name="slug"
			type="text"
			autocomplete="off"
			spellcheck="false"
			bind:value={slug}
			oninput={typed}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
		/>
	</label>
	<p class="opacity-80 break-all" data-testid="slug-url">{page.url.origin}{base}/sites/{slug}</p>
	<SlugFeedback {view} onchoose={choose} />
	{#if !slug.trim()}
		<button type="button" class="btn variant-ghost-surface min-h-[44px]" onclick={regenerate}>
			Proposer une adresse à partir du nom et du lieu
		</button>
	{/if}
</div>
