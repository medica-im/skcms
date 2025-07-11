<script lang="ts">
	import { page } from '$app/state';
	import { currentOrg, limitCategories } from '$lib/store/directoryStore.ts';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers.ts';
	import { organizationStore } from '$lib/store/facilityStore.ts';
	import * as m from "$msgs";	import ProgramNav from '$lib/ProgramNav/ProgramNav.svelte';
	import vaccines2024h from '$assets/images/vaccines/vaccination_schedule_2024_horizontal.png';
	import vaccines2024v from '$assets/images/vaccines/vaccination_schedule_2024_vertical.png';
	import vaccinsATousLesAges2024 from '$assets/pdf/vaccines/vaccins_a_tous_les_ages_2024.pdf';
	import calendrierSimplifieVaccinationsPdf2024 from '$assets/pdf/vaccines/calendrier_simplifie_des_vaccinations_2024.pdf';
	import calendrierSimplifieVaccinationsJpg2024 from '$assets/images/vaccines/calendrier_simplifie_des_vaccinations_2024.jpg';
	import Directory from '$lib/components/Directory/CtxDirectory.svelte';
	import { Fa, FaLayers } from 'svelte-fa';
	import { faCalendarCheck }from '@fortawesome/free-regular-svg-icons';
	import {
		faImage,
		faFilePdf,
		faHouse,
		faTimes,
		faTimeline,
		faBookMedical,
		faHouseMedical,
		faUserNurse,
		faPrescriptionBottleMedical,
		faMapLocationDot,
		faAddressBook,
		faEnvelope,
		faBlog,
		faUserPlus,
		faUser,
		faCircleNodes,
		faMapPin,
		faNetworkWired,
		faHandshake,
		faPeopleGroup,
		faArrowRight,
		faDownload
	} from '@fortawesome/free-solid-svg-icons';
	import { programsNavLinks } from "$var/variables.ts";

	export let data;
	const mobileWidth: number = 1440;

	$: innerWidth = 0;
</script>

<svelte:window bind:innerWidth />

<svelte:head>
	<title>
		Vaccins - {capitalizeFirstLetter(m.PREVENTIVE_HEALTHCARE())} - {capitalizeFirstLetter(
			$organizationStore.formatted_name
		)}
	</title>
</svelte:head>

<header>
	<div class="section-container">
		<span class="badge variant-filled-surface"
			>{capitalizeFirstLetter(m.PREVENTIVE_HEALTHCARE())}</span
		>

		<h1 class="h1">Vaccins</h1>
		<p>
			Lorsque nous rencontrons un microbe et tombons malade, notre système immunitaire se défend en
			fabriquant des anticorps, destinés à neutraliser et éliminer ce microbe. La vaccination
			fonctionne de la même manière, tout en évitant les dangers liés à la maladie. Lorsque nous
			recevons un vaccin, un microbe rendu inoffensif ou une partie de microbe est introduit dans
			notre corps. Il ne nous rend pas malade, mais notre système immunitaire fabrique quand même
			des anticorps pour neutraliser ou éliminer le microbe. Si nous rencontrons un jour le vrai
			microbe, notre système immunitaire le reconnaitra tout de suite et l’éliminera avant qu’il ne
			puisse nous rendre malade.
		</p>
	</div>
</header>

<section>
	<div class="section-container">
		<h2 class="h2">Les vaccins à tous les âges</h2>
		<p>Calendrier 2024</p>
		{#if innerWidth <= mobileWidth}
			<img src={vaccines2024v} alt="calendrier vaccinal 2024" />
			<a href={vaccines2024v} class="btn variant-filled" download="calendrier_vaccinal_2024">
				<span><Fa icon={faDownload}/></span>
				<span>Télécharger</span>
				<span><Fa icon={faImage}/></span>
			</a>
		{:else}
			<img src={vaccines2024h} alt="calendrier vaccinal 2024" />
			<a href={vaccines2024h} class="btn variant-filled" download="calendrier_vaccinal_2024">
				<span><Fa icon={faDownload}/></span>
				<span>Télécharger</span>
				<span><Fa icon={faImage}/></span></a>
		{/if}
		<a href={vaccinsATousLesAges2024} class="btn variant-filled" download="vaccins_a_tous_les_ages_2024">
			<span><Fa icon={faDownload}/></span>
			<span>Télécharger</span>
			<span><Fa icon={faFilePdf}/></span></a>
		
	</div>
</section>

<section>
	<div class="section-container">
		<h2 class="h2">Vaccination contre la grippe et le Covid-19</h2>
        <p>Avec la MSP de Gadagne, trois possibilités.</p>
		<div class="grid grid-cols-1 lg:grid-cols-3 p-2 m-2 content-evenly">
			<a href="/annuaire/medecin-generaliste" class="card variant-ringed-primary p-4 m-2 space-y-2 justify-items-center grow">
				<div><Fa icon={faHouseMedical} size={"lg"} /></div>
				<div class="text-lg">Maison de santé</div>
				<div class="flex flex-wrap gap-2">
					<div><Fa icon={faCalendarCheck}/></div>
				  <div>Sur RDV</div>
				</div>
				<div>Médecins</div>
			</a>
			
			<a href="/sites/pharmacie-des-felibres" class="card variant-ringed-primary p-4 m-2 space-y-2 justify-items-center grow">
				<div><Fa icon={faPrescriptionBottleMedical} size={"lg"} /></div>
				<div class="text-lg">Pharmacie</div>
				<div class="flex flex-wrap gap-2">
					<FaLayers>
						<Fa icon={faCalendarCheck}/>
						<Fa icon={faTimes} scale={2}/>
					  </FaLayers>
					  Sans RDV
					
				</div>
				<div>Pharmaciennes</div>
			</a>
			<a href="/annuaire/infirmiere" class="card variant-ringed-primary p-4 m-2 space-y-2 justify-items-center grow">
				<div><Fa icon={faHouse} size={"lg"} /></div>
				<div class="text-lg">À domicile</div>
				<div class="flex flex-wrap gap-2">
					<span><Fa icon={faCalendarCheck}/></span>
				  <span>Sur RDV</span>
				</div>
				<div>Infirmières</div>
			</a>
		</div>
	</div>
</section>

<section>
	<div class="section-container space-y-4">
		<h2 class="h2">Centres de vaccination</h2>
			<Directory
				data={data?.cardinal}
				propCurrentOrg={null}
				displayCommune={true}
				displayCategory={false}
				setRedirect={false}
				propLimitCategories={['centre-vaccination-internationale']}
				avatar={false}
			/>
	</div>
</section>

<section>
	<div class="section-container">
		<h2 class="h2">Ressources utiles</h2>
		<h3 class="h3">Pages web</h3>
		<div class="pl-5">
			<ul class="list-disc space-y-4 p-4">
				<li><a href="https://vaccination-info-service.fr/" rel="external" class="anchor">Vaccination Info Service</a></li>
				<li><a href="https://www.pasteur.fr/fr/centre-medical/preparer-son-voyage" rel="external" class="anchor">Préparez votre voyage</a> avec l'Institut Pasteur: connaître les vaccinations recommandées et les précautions sanitaires, en particulier pour le paludisme</li>
			</ul>
		</div>
		<h3 class="h3">Calendrier simplifié des vaccinations</h3>
		<p>Ce document est également disponible au format carte postale à l'accueil de la maison de santé.</p>
		<img src={calendrierSimplifieVaccinationsJpg2024} alt="calendrier simplifié des vaccinations 2024" />
		<p><a class="anchor" href="/prevention/vaccins/calendrier">Version accessible du calendrier simplifié des vaccinations</a> au format web.</p>
		<a href={vaccines2024h} class="btn variant-filled" download="calendrier_simplifie_des_vaccinations_2024">
			<span><Fa icon={faDownload}/></span>
			<span>Télécharger</span>
			<span><Fa icon={faFilePdf}/></span></a>
	</div>
</section>

<section>
	<div class="section-container">
		<ProgramNav pathname={page.url.pathname} {programsNavLinks} />
	</div>
</section>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-7xl space-y-2 p-4 py-4 md:space-y-4 md:py-8;
	}
	dt {
		font-weight: bold;
	}
</style>
