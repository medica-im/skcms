<!--
	Test harness for the modals the app opens through Skeleton's modal store.

	+layout.svelte mounts one <Modal> with the registry of components that can
	be opened by name, and the app bar, the search and the signup form open them
	with getModalStore().trigger(). This mounts the same pair, with a button to
	trigger what a test asks for, so a store modal is tested without the layout
	around it.

	Keep the registry in step with +layout.svelte's modalComponentRegistry.
-->
<script lang="ts">
	import { initializeStores, Modal, getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import Search from './Search.svelte';

	let { settings, label = 'Open' }: { settings: ModalSettings; label?: string } = $props();

	initializeStores();
	const modalStore = getModalStore();
</script>

<button type="button" onclick={() => modalStore.trigger(settings)}>{label}</button>
<Modal components={{ modalSearch: { ref: Search } }} />
