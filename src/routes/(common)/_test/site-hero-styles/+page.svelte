<script lang="ts">
	/**
	 * A design fixture for the /sites/[slug] page.
	 *
	 * The live page paints its title band with a radial gradient built from
	 * `secondary-500` and `error-500` — turquoise into pinkish red. Under the
	 * Wintry theme that is a clash rather than a choice: Wintry's own page
	 * background is secondary into *tertiary* (sky into indigo), so the band
	 * introduces a magenta the palette never uses anywhere else. The content
	 * area below carries nothing at all today.
	 *
	 * This mirrors the Pharmacie des Félibres page — the real title, address,
	 * photograph, map and avatars, through the same components the real page
	 * uses — and switches the band and body treatment without touching the
	 * rest. The real photograph matters: a grey placeholder tells you nothing
	 * about how a gradient sits against a full-colour image of a building.
	 *
	 * Dev-only: +page.ts throws 404 outside `dev`.
	 */
	import { Avatar, RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
	import MapLibre from '$lib/MapLibre/MapLibre.svelte';
	import { createFacilitiesMapData } from '$lib/components/Map/mapData.ts';
	import { PUBLIC_URL } from '$lib/utils/appUrl';
	import type { Facility } from '$lib/interfaces/facility.interface.js';
	import Fa from 'svelte-fa';
	import { faUser } from '@fortawesome/free-solid-svg-icons';

	type Style = {
		id: string;
		label: string;
		/** Classes applied to the <header>. */
		header: string;
		/**
		 * Classes applied to the content area below the band. The live page
		 * leaves it bare — only Wintry's fixed body gradient shows through — so
		 * each proposal here says what, if anything, the body should carry to
		 * sit with its band.
		 */
		main: string;
		/**
		 * Classes applied to each card in the content area, when the proposal
		 * groups the content into cards rather than leaving it loose.
		 */
		card: string;
		/** Why this one might be preferable, shown under the selector. */
		note: string;
	};

	const styles: Style[] = [
		{
			id: 'seamless',
			label: 'Wintry, seamless',
			header: '',
			main: '',
			card: 'card p-4',
			note: 'No band at all: the title sits straight on Wintry\u2019s own page gradient, which the theme already paints at the top of the viewport. Nothing is drawn twice and there is no seam to notice. The cards give the content its structure instead.'
		},
		{
			id: 'seamless-plain',
			label: 'Wintry, no cards',
			header: '',
			main: '',
			card: '',
			note: 'The same, with the content left loose as it is today. Shows what the page looks like when the band is simply removed and nothing else changes \u2014 the smallest possible edit.'
		},
		{
			id: 'rule',
			label: 'Seamless + rule',
			header: 'border-b border-surface-300-600-token',
			main: '',
			card: 'card p-4',
			note: 'No background on the band, only a hairline under the title. Marks where the header ends without introducing a second surface \u2014 the middle ground if the title feels adrift without a boundary.'
		},
		{
			id: 'banded',
			label: 'Wintry, banded',
			header: 'bg-surface-100-800-token hero-wintry',
			main: 'main-wintry',
			card: 'card p-4',
			note: 'Wintry\u2019s gradient re-drawn inside a band of its own. The theme already paints these colours on the body, so they land twice at different scales and a seam shows where the band stops \u2014 this is the look in question.'
		},
		{
			id: 'current',
			label: 'Current',
			header: 'bg-surface-100-800-token hero-current',
			main: '',
			card: '',
			note: 'Shipping today: turquoise (secondary) into pinkish red (error). Wintry\u2019s error-500 is a magenta the palette uses nowhere else, and it sits in a band over the theme\u2019s own gradient.'
		}
	];

	// Opens on what the real page ships: no band, content left loose.
	let selected = $state('seamless-plain');
	const style = $derived(styles.find((s) => s.id === selected) ?? styles[0]);

	// Pharmacie des Félibres, as the live page serves it: the real address,
	// coordinates and zoom, the real facade photograph, and the nine
	// pharmacists with the two profile pictures that exist. Real media is the
	// point of the fixture — a grey box cannot tell you whether a gradient
	// fights the photograph next to it.
	const facility = {
		uid: '91e4e13c-f73e-4ed5-84e1-22b1f814c3bb',
		name: 'Pharmacie des Félibres',
		label: 'Pharmacie des Félibres',
		slug: 'pharmacie-des-felibres',
		address: {
			street: '41 Pl. du Felibrige',
			zip: '84470',
			city: 'Châteauneuf-de-Gadagne',
			latitude: '43.926553',
			longitude: '4.9453706',
			zoom: 17
		}
	} as unknown as Facility;

	const placeImage =
		'/media/place_images/91e4e13c-f73e-4ed5-84e1-22b1f814c3bb.jpg.1280x720_q85_crop-smart.jpg';

	// Only two of the nine have a picture; the rest fall back to the same user
	// icon the real Entries component shows, which is worth seeing in the mix.
	const pharmacists: { name: string; avatar?: string }[] = [
		{ name: 'Thimotée Cuisinier' },
		{ name: 'Sue Holter' },
		{ name: 'Octave Toutou' },
		{ name: 'Sofia Russia' },
		{ name: 'Roger Boyle' },
		{ name: 'Franck Truc' },
		{ name: 'Édouard Leclerc' },
		{
			name: 'Florence Senechal-Viennot',
			avatar: '/media/profile_images/florence_senechal-viennot.jpg.256x256_q85_crop-smart.jpg'
		},
		{
			name: 'Sara Discours Mombelli',
			avatar: '/media/profile_images/sarah_discours_BM8zwa8.jpg.256x256_q85_crop-smart.jpg'
		}
	];
</script>

<svelte:head>
	<title>Hero and body styles — Pharmacie des Félibres fixture</title>
</svelte:head>

<!--
	The selector is deliberately outside the mimicked page, above it, so that
	nothing it adds (its own surface, its own spacing) is mistaken for part of
	the design being judged.
-->
<div class="p-4 space-y-3 border-b border-surface-300-600-token">
	<h1 class="h4">Site page — band and content treatments</h1>
	<RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary" flexDirection="flex-wrap">
		{#each styles as s}
			<RadioItem bind:group={selected} name="style" value={s.id}>{s.label}</RadioItem>
		{/each}
	</RadioGroup>
	<p class="text-sm opacity-80 max-w-3xl">{style.note}</p>
</div>

<!-- Everything below mirrors src/routes/(common)/sites/[slug]/+page.svelte. -->
<header id="hero" class="relative {style.header}">
	<div class="mx-0 flex flex-col items-center justify-center p-4 py-6">
		<h2 class="h2">{facility.name}</h2>
	</div>
</header>

<div
	class="mx-0 flex flex-col items-center justify-center p-4 py-6 lg:px-8 xl:px-12 2xl:px-20 {style.main}"
>
	<div class="grid grid-cols-1 w-full gap-4 mx-auto justify-items-center">
		<div
			class="flex flex-col lg:flex-row lg:flex-nowrap gap-8 w-full mx-auto items-center lg:items-start"
		>
			<div class="space-y-4 w-full max-w-lg lg:max-w-none lg:flex-1 lg:min-w-0 {style.card}">
				<address>
						{facility.address.street}<br />
						{facility.address.zip}
						{facility.address.city}
					</address>
				<div class="w-full">
					<div class="py-6 space-y-2 gap-2 flex flex-col">
						<div>
							<span class="p-2 btn variant-ghost-primary btn-sm">
								<span class="text-wrap">{pharmacists.length} pharmaciennes</span>
							</span>
							<div class="flex flex-wrap gap-2 p-2">
								{#each pharmacists as person}
									<span class="btn btn-sm variant-ghost gap-1 p-1">
										<Avatar
											src={person.avatar ? `${PUBLIC_URL}${person.avatar}` : undefined}
											width="w-10 lg:w-12"
										>
											<Fa icon={faUser} />
										</Avatar>
										{person.name}
									</span>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
			<!-- The real facade photograph, at the 16:9 frame the live page uses. -->
			<div class="mx-auto w-full max-w-lg lg:max-w-none lg:flex-1 lg:min-w-0 {style.card}">
				<figure class="mx-auto w-full">
					<img
						class="w-full h-auto aspect-video object-cover rounded-container-token"
						src="{PUBLIC_URL}{placeImage}"
						alt="devanture"
					/>
					<figcaption class="text-center w-full">
						<div class="mx-auto text-primary">{facility.name}</div>
					</figcaption>
				</figure>
			</div>
			<!--
				The real map, at the fixed height the live page gives it. The card
				padding would eat into that height, so the card goes on the frame
				inside and the column keeps its size.
			-->
			<div class="h-64 lg:h-96 z-0 mx-auto w-full max-w-lg lg:max-w-none lg:flex-1 lg:min-w-0">
				<div class="w-full h-full {style.card}">
					<MapLibre
						data={createFacilitiesMapData([facility])}
						showTooltip={false}
						target={null}
					/>
				</div>
			</div>
		</div>
		<a href="#top" class="btn variant-filled w-fit">
			<span class="whitespace-normal text-left">Tous les sites</span>
		</a>
		<span class="btn variant-ghost-primary">
			<span class="whitespace-normal text-left">Annuaire</span>
		</span>
	</div>
</div>

<style lang="postcss">
	/* The band in production today. */
	/* prettier-ignore */
	.hero-current {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 98% 1%, rgba(var(--color-error-500) / 0.33) 0px, transparent 50%);
	}

	/*
		Wintry's own body gradient, verbatim from the theme, at the opacities the
		theme uses. Applied to the band it reads as a denser patch of the page
		background rather than as a second colour scheme.
	*/
	/* prettier-ignore */
	.hero-wintry {
		background-image:
			radial-gradient(at 50% 0%, rgba(var(--color-secondary-500) / 0.50) 0px, transparent 75%),
			radial-gradient(at 100% 0%, rgba(var(--color-tertiary-500) / 0.40) 0px, transparent 50%);
	}

	/* prettier-ignore */
	.hero-primary {
		background-image:
			radial-gradient(at 50% 0%, rgba(var(--color-primary-500) / 0.28) 0px, transparent 70%);
	}

	/* prettier-ignore */
	.hero-glow {
		background-image:
			radial-gradient(at 50% -20%, rgba(var(--color-secondary-500) / 0.35) 0px, transparent 60%);
	}

	/*
		Body treatments. These continue the band's colour downward at a fraction
		of its strength and let it die out well before the foot of the content,
		so the two areas read as one surface instead of as a coloured strip laid
		on a plain page. The stops are in percentages of the content area, which
		is far taller than the band — hence the much shorter reach.
	*/
	/* prettier-ignore */
	.main-wintry {
		background-image:
			radial-gradient(at 50% 0%, rgba(var(--color-secondary-500) / 0.14) 0px, transparent 45%),
			radial-gradient(at 100% 0%, rgba(var(--color-tertiary-500) / 0.10) 0px, transparent 35%);
	}

	/* prettier-ignore */
	.main-primary {
		background-image:
			radial-gradient(at 50% 0%, rgba(var(--color-primary-500) / 0.10) 0px, transparent 40%);
	}

	/*
		The dark theme wants the same gradients at lower opacity — at the light
		values they glare against a dark surface. Wintry halves its own for the
		same reason.
	*/
	@media (prefers-color-scheme: dark) {
		/* prettier-ignore */
		.hero-wintry {
			background-image:
				radial-gradient(at 50% 0%, rgba(var(--color-secondary-500) / 0.18) 0px, transparent 75%),
				radial-gradient(at 100% 0%, rgba(var(--color-tertiary-500) / 0.18) 0px, transparent 50%);
		}
		/* prettier-ignore */
		.hero-primary {
			background-image:
				radial-gradient(at 50% 0%, rgba(var(--color-primary-500) / 0.15) 0px, transparent 70%);
		}
		/* prettier-ignore */
		.hero-glow {
			background-image:
				radial-gradient(at 50% -20%, rgba(var(--color-secondary-500) / 0.18) 0px, transparent 60%);
		}
		/* prettier-ignore */
		.main-wintry {
			background-image:
				radial-gradient(at 50% 0%, rgba(var(--color-secondary-500) / 0.07) 0px, transparent 45%),
				radial-gradient(at 100% 0%, rgba(var(--color-tertiary-500) / 0.05) 0px, transparent 35%);
		}
		/* prettier-ignore */
		.main-primary {
			background-image:
				radial-gradient(at 50% 0%, rgba(var(--color-primary-500) / 0.05) 0px, transparent 40%);
		}
	}
</style>
