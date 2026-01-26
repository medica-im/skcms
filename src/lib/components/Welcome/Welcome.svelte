<script lang="ts">
	import * as m from "$msgs";
	import { page } from "$app/state";
	let {
		formattedNameDefiniteArticle
	} : {
		formattedNameDefiniteArticle: string
	} = $props();
</script>

<h1 class="h1">
	{m.HOME_WELCOME()}
	{formattedNameDefiniteArticle}{#if page.data.session && page.data.session.user.name}&ensp;<span style="text-transform: capitalize; display:inline-block;">{page.data.session.user.name}</span>{/if}&#8239;!
</h1>
