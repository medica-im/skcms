<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import Fa from 'svelte-fa';
	import {
		faCircleInfo,
		faTriangleExclamation,
		faEnvelope,
		faRightToBracket
	} from '@fortawesome/free-solid-svg-icons';
	// Google's "Créer une adresse e-mail" screen, rendered from a saved copy of
	// the page, with a ring drawn around the button invitees must click.
	import googleCreateEmail from '$lib/assets/images/google-create-email.png';

	// Long-form help prose is written in French in the markup, like the user
	// guide and UnknownEmail.svelte: no message keys exist for it.
	const organization = $derived(page.data.organization?.formatted_name ?? 'notre organisation');
</script>

<article class="mx-auto w-full max-w-3xl space-y-8 p-4 py-8" data-testid="google-account-help">
	<header class="space-y-2">
		<h1 class="h2">Se connecter avec Google</h1>
		<p class="text-lg">Comment utiliser votre invitation, avec ou sans compte Google.</p>
	</header>

	<aside class="card variant-soft-primary flex gap-4 p-4" data-testid="one-invitation-one-address">
		<div class="pt-1"><Fa icon={faCircleInfo} size="lg" /></div>
		<div class="space-y-2">
			<p class="font-bold">
				Une invitation correspond à une seule adresse e-mail : celle à laquelle vous l'avez reçue.
			</p>
			<p>
				Pour que {organization} vous reconnaisse, connectez-vous avec un compte Google qui utilise
				exactement cette adresse.
			</p>
		</div>
	</aside>

	<section class="space-y-3" data-testid="google-account-not-gmail">
		<h2 class="h3">Un compte Google n'est pas une adresse Gmail</h2>
		<p>
			Un compte Google sert simplement à prouver qui vous êtes. Il peut fonctionner avec
			<strong>n'importe quelle adresse e-mail</strong> : celle de votre cabinet, une adresse Orange,
			Free, La Poste, Outlook…
		</p>
		<p>
			Gmail n'est que la messagerie de Google. <strong>Vous n'en avez pas besoin</strong>. Créer un
			compte Google avec votre adresse habituelle ne change rien à votre messagerie : vous continuez
			à lire vos e-mails exactement comme avant.
		</p>
	</section>

	<section class="space-y-4">
		<h2 class="h3">Quelle est votre situation ?</h2>
		<div class="grid gap-4 md:grid-cols-3">
			<div class="card space-y-2 p-4">
				<h3 class="h4">Votre adresse se termine par @gmail.com</h3>
				<p>
					Vous avez déjà un compte Google. Cliquez sur « Se connecter avec Google » et choisissez
					cette adresse.
				</p>
			</div>
			<div class="card space-y-2 p-4">
				<h3 class="h4">Une autre adresse, déjà utilisée chez Google</h3>
				<p>
					Par exemple pour YouTube, Google Agenda ou un téléphone Android. Votre compte Google
					existe déjà : connectez-vous directement.
				</p>
			</div>
			<div class="card space-y-2 p-4">
				<h3 class="h4">Une autre adresse, sans compte Google</h3>
				<p>
					Créez un compte Google avec cette adresse. C'est gratuit et prend environ une minute :
					suivez les étapes ci-dessous.
				</p>
			</div>
		</div>
		<p>
			Vous ne savez pas ? Cliquez sur « Se connecter avec Google » et saisissez votre adresse. Si
			Google ne trouve pas de compte, il vous propose d'en créer un.
		</p>
	</section>

	<section class="space-y-4">
		<h2 class="h3">Créer un compte Google avec votre adresse habituelle</h2>
		<ol class="list-decimal space-y-3 pl-6">
			<li>
				Sur la page de connexion de ce site, cliquez sur « Se connecter avec Google ». Si Google
				propose directement un autre compte, choisissez « Utiliser un autre compte ».
			</li>
			<li>Cliquez sur « Créer un compte », puis indiquez votre nom et votre date de naissance.</li>
			<li data-testid="existing-address-step">
				<p>
					À l'écran « Créer une adresse e-mail », Google affirme qu'il faut une adresse Gmail et vous
					en propose plusieurs, déjà prêtes.
				</p>
				<div class="card variant-soft-warning mt-2 flex gap-4 p-4">
					<div class="pt-1"><Fa icon={faTriangleExclamation} size="lg" /></div>
					<p>
						<strong>Ce n'est pas nécessaire.</strong> Ne choisissez aucune de ces adresses. Cliquez
						sur <strong>« Utiliser l'adresse e-mail existante »</strong>, à côté du bouton « Suivant »,
						puis saisissez l'adresse à laquelle vous avez reçu l'invitation.
					</p>
				</div>
				<figure class="mt-4 space-y-2">
					<img
						src={googleCreateEmail}
						width="390"
						height="543"
						alt="Écran Google « Créer une adresse e-mail » : deux adresses Gmail proposées, l'option « Créer votre propre adresse Gmail », et, entouré en rouge, le lien « Utiliser l'adresse e-mail existante » à gauche du bouton « Suivant »."
						class="border-surface-300-600-token h-auto w-full max-w-[390px] rounded-container-token border"
					/>
					<figcaption class="text-sm">
						L'écran de Google : cliquez sur le lien entouré en rouge, situé en bas de l'écran :
						« Utiliser l'adresse e-mail existante ».
					</figcaption>
				</figure>
			</li>
			<li>
				Google vous envoie un code de vérification à cette adresse. Ouvrez votre messagerie
				habituelle et recopiez le code.
			</li>
			<li>Choisissez un mot de passe et terminez la création du compte.</li>
			<li>
				Vous revenez sur ce site : votre compte y est créé automatiquement, et vous avez accès aux
				services de {organization}.
			</li>
		</ol>
	</section>

	<section class="space-y-3" data-testid="other-address">
		<h2 class="h3">Et si je me connecte avec une autre adresse ?</h2>
		<p>
			La connexion fonctionnera, mais le site ne vous reconnaîtra pas comme membre de
			{organization} : l'invitation ne peut pas passer d'une adresse à une autre.
		</p>
		<p>
			Pour utiliser une autre adresse, contactez-nous en indiquant laquelle : nous vous enverrons une
			nouvelle invitation à cette adresse.
		</p>
	</section>

	<footer class="flex flex-wrap gap-4">
		<a href="{base}/signin" class="btn variant-filled-primary">
			<Fa icon={faRightToBracket} /><span>Se connecter</span>
		</a>
		<a href="{base}/contact" class="btn variant-ghost-surface">
			<Fa icon={faEnvelope} /><span>Nous contacter</span>
		</a>
	</footer>
</article>
