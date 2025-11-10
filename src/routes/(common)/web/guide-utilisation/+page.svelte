<script lang="ts">
	import * as m from '$msgs';
	import { page } from '$app/state';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { TableOfContents, tocCrawler } from '@skeletonlabs/skeleton';
</script>

<svelte:head>
	<!--{#if data?.openGraph}
		<OpenGraph opengraph={data.openGraph} />
	{/if}-->
	<title>
		{capitalizeFirstLetter(m.USER_GUIDE())} - {capitalizeFirstLetter(
			page.data.organization.formatted_name
		)}
	</title>
</svelte:head>

<header id="hero" class="bg-surface-100-800-token hero-gradient">
	<div class="mx-0 flex flex-col items-center justify-center p-4 py-6 space-y-2">
		<h2 class="h2">Guide d'utilisation</h2>
		
	</div>
</header>
<div use:tocCrawler={{ mode: 'generate' }}>
<section id="team" class="flex flex-wrap bg-surface-100-800-token team-gradient">
	<div class="mx-auto p-4 py-8 w-1/5">
		<TableOfContents class="sticky top-10">
			<h1>Sommaire</h1>
		</TableOfContents>
	</div>
	<div class="section-container w-4/5">
		<h3 class="h3">Structure de l'annuaire</h3>
		<h4 class="h4">Effecteur</h4>
		<p>
			Un effecteur est un producteur de soins (infirmière, médecin) ou de travail médico-social (assistante sociale), ou encore un prestataire de services ou de matériel (structure dispensatrice
			d’oxygène à usage médical) pour le domaine médico-social, qui appartient à une catégorie et exerce dans un établissement donné.
		</p>
		<p>Un effecteur est donc la connexion d'une personne, d'une catégorie et d'un établissement.</p>
		<h4 class="h4">Établissement</h4>
		<p>
			Un établissement est le lieu de rattachement d'une ou plusieurs personnes physiques ou d'une
			personne morale. Un établissement a une adresse, des coordonnées GPS et parfois un nom.
		</p>
		<h4 class="h4">Catégorie</h4>
		<p>
			Une catégorie peut caractériser le type de travail d'un effecteur (kinésithérapeute, portage
			de repas à domicile) ou un type d'organisation qui regroupe des effecteurs (MSP, CPTS,
			maternité)
		</p>
		<h4 class="h4">Personne</h4>
		<dl class="list-dl">
			<dt>Personne physique</dt>
			<dd>
				Une personne qui effectue une ou plusieurs catégories de travail et qui est rattachée à un
				ou plusieurs établissements. Une même personne physique peut apparaître dans plusieurs
				entrées de l'annuaire.
			</dd>
		</dl>
		<dl class="list-dl">
			<dt>Personne morale</dt>
			<dd>
				Organisation, entreprise, association, institution, administration ou collectivité
				territoriale qui effectue une ou plusieurs catégories de travail, qui emploie ou regroupe
				une ou plusieurs personnes physiques et qui a un ou plusieurs établissements.
			</dd>
		</dl>
		<h4 class="h4">Entrée</h4>
		<p>
			Une entrée de l'annuaire est une fiche qui correspond à un effecteur (orthophoniste) ou à une
			organisation qui regroupe plusieurs effecteurs (MSP, CPTS, CCAS, centre hospitalier).
		</p>
		<p>Chaque entrée a sa propre page web accessible directement via une adresse web (URL).</p>
		<p>
			La page d'accueil de l'annuaire présente toutes les entrées sous la forme d'une liste de
			fiches de synthèse (personne, catégorie, établissement, téléphone) ou de points sur une carte
			géographique. Il suffit de cliquer sur une fiche ou un point pour accéder à la page présentant
			l'entrée en détail.
		</p>
		<h3 class="h3">Créer une entrée</h3>
		<h4 class="h4">1. Sélectionner ou créer un établissement</h4>
		<p>Pour assurer la cohérence de l'annuaire, il est important de ne pas créer d'établissements en double. C'est aussi un gain de temps: un établissement auquel sont rattachés de nombreux effecteurs n'est créé qu'une fois puis réutilisé.</p>
		<h5 class="h5">Sélectionner un établissement</h5>
		<p>Recherche dans la liste en tapant les premières lettres du nom de l'établissement ou en faisant défiler les établissements dans la liste. Sélectionner le département et la commune peut affiner et donc accélérer la recherche. Ajouter le nom de l'établissement lors de sa création permet de le retrouver plus rapidement.</p>
		<h5 class="h5">Créer un établissement</h5>
		<p>Dans le formulaire de création d'établissement, il faut privilégier l'utilisation du "géocodeur": c'est le champ "Entrer l'adresse".
Entrez le numéro et le nom de la voix, une seconde après, le logiciel appelle la base nationale des adresses et propose des adresses: un clic sur la bonne adresse permet d'obtenir numéro et nom de voie, code postal et coordonnées GPS. C'est plus précis et beaucoup plus rapide que d'entrer l'adresse, le code postal et les coordonnées GPS manuellement.
Dans de rares cas, l'adresse n'existe pas dans la base nationale (nouveau lotissement ou commune où la mairie n'a pas correctement renseigné certaines voies rurales). Il faut alors choisir une adresse existante proche et/ou corriger le numéro et/ou le nom de la voie, et cliquer sur la carte pour enregistrer l'emplacement GPS le plus exact possible.
</p>
	<h4 class="h4">2. Sélectionner une catégorie</h4>
<p>En entrant les premières lettres du nom, du sigle ou d'un synonyme de la catégorie. Par exemple, pour "communauté professionnelle territoriale de santé", taper "commu" ou "cpt" permet de sélectionner la catégorie. Une fois la bonne catégorie sélectionnée dans la liste, il suffit de presser la touche Entrée <kbd>⏎</kbd> pour enregistrer votre choix.</p>
<p>Si la catégorie que vous recherchez n'est pas dans la liste, il suffit de nous envoyer un <a href="mailto:contact@medecinelibre.com" class="anchor">mail</a> avec le nom, la description de la catégorie et d'éventuels synonymes et nous l'ajouterons sous deux jours ouvrés.</p>

	<h4 class="h4">3. Sélectionner ou créer une personne</h4>
	<p>Comme pour les établissements, il faut éviter d'avoir des personnes physiques en double. Merci de vérifier si la personne existe déjà avant de la créer.</p>
	<p>Il n'est pas nécessaire de sélectionner un genre grammatical pour une personne morale.</p>
	<p>Le formulaire de sélection et le formulaire de création de personne vous permettent de préciser si la personne, dans le contexte de l'entrée (une catégorie donnée), appartient ou pas à l'organisation qui gère l'annuaire.</p>

	<h4 class="h4">4. Confirmer la création de l'entrée</h4>
	<p>Simple étape de vérification des choix et de confirmation. Après confirmation, l'entrée sera créé immédiatement et votre navigateur web affichera la page de la fiche nouvellement créée, où vous pourrez commencer à entrer les autres coordonnées et les données supplémentaires.</p>
	</div>
</section>
</div>

<style lang="postcss">
	.section-container-centered {
		@apply mx-auto flex w-full max-w-7xl items-center justify-center p-4 py-8;
	}
	.section-container {
		@apply mx-auto grid grid-cols-1 gap-6 p-4 py-8;
	}
	/* Hero Gradient */
	/* prettier-ignore */
	.hero-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 98% 1%, rgba(var(--color-error-500) / 0.33) 0px, transparent 50%);
	}
	/* SvelteKit Gradient */
	/* prettier-ignore */
	.team-gradient {
		background-image:
			radial-gradient(at 0% 100%, rgba(var(--color-secondary-500) / 0.50) 0px, transparent 50%);
	}
</style>
