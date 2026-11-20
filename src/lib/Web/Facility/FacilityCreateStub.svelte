<!--
	Stands in for the facility creation page (routes/(common)/web/facility/create)
	in the tests of the component that opens it in a dialog.

	The real page needs a geocoder, a map and a remote form; what the host's
	tests care about is narrower: the page reads `data.organization` from the
	state the host's goto left in page.state, and leaves through
	`facilityCreateOpen = false; history.back()`. Both are reproduced here.

	Keep the leave sequence in step with that page's Annuler button.
-->
<script lang="ts">
	let {
		data,
		facilityCreateOpen = $bindable()
	}: {
		data: { organization: { name: string } };
		facilityCreateOpen?: boolean;
		[key: string]: unknown;
	} = $props();
</script>

<h3 class="h3">Créer un établissement pour {data.organization.name}</h3>
<button
	type="button"
	onclick={() => {
		facilityCreateOpen = false;
		history.back();
	}}>Annuler</button
>
