<script lang="ts">
	import type { Session } from '@auth/sveltekit';
	import { base } from '$app/paths';
	let { session }: { session: Session | null | undefined } = $props();
</script>

<div class="alert-message" data-testid="unknown-email">
	<h3 class="h3">Bonjour {session?.user?.name}!</h3>
	<p>
		Merci de votre visite. Votre email <q>{session?.user?.email}</q> ne figure pas dans la liste
		des utilisateurs connus de ce service. Peut-être avons-nous enregistré une autre
		adresse de courrier électronique au moment de votre inscription? Si vous pensez qu'il
		s'agit d'une erreur, merci de nous
		<a href="{base}/contact" class="anchor">contacter</a>.
	</p>
</div>
