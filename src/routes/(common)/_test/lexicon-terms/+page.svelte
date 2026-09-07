<script lang="ts">
	import Def from '$lib/components/TooltipDefinition/Def.svelte';
</script>

<svelte:head>
	<title>Lexicon terms fixture</title>
</svelte:head>

<!--
	Prose carrying every case the lexicon has, on one page.

	Written as a fixture rather than tested against a real page because a real
	page's wording changes for editorial reasons, and a test pinned to it fails
	for reasons that have nothing to do with the lexicon. Here each paragraph
	exists to exercise one case and says so.
-->
<section>
	<div class="mx-auto w-full max-w-5xl space-y-6 p-4 py-8">
		<h1 class="h1">Lexicon terms fixture</h1>

		<!-- A synonym: the reader meets the abbreviation, and the definition it
		     carries belongs to the term it points at. -->
		<p data-testid="synonym">
			Notre <Def w="MSP" /> réunit plusieurs professionnels de santé sur un même territoire.
		</p>

		<!-- A term that holds its own text, with a second paragraph — so it
		     offers the lexique page. -->
		<p data-testid="canonical">
			Elle s'est constituée à partir d'une <Def w="Équipe de soins primaires" /> déjà en place.
		</p>

		<!-- The same term twice: two popups, each independent, which is what the
		     random popup target has to guarantee. -->
		<p data-testid="repeat">
			Une <Def w="MSP" /> n'est pas un centre de santé, et une <Def w="MSP" /> reste un exercice
			libéral.
		</p>

		<!-- A term the lexicon does not have: the page keeps working and simply
		     offers nothing to open. -->
		<p data-testid="unknown">
			Le sigle <Def w="INCONNU" /> n'est pas au lexique.
		</p>
	</div>
</section>
