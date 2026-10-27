<script lang="ts">
	/**
	 * A bare facility map, for features/map-popup-contrast.feature.
	 *
	 * The popup's colours are the point of the scenario, and on a real page they
	 * depend on that site's data being present and its section being scrolled to.
	 * Rendering the map alone with fixed coordinates makes the scenario about the
	 * component rather than about whichever tenant the worker happens to serve.
	 *
	 * Dev-only: +page.ts throws 404 outside `dev`, so this never answers in
	 * production.
	 */
	import { page } from '$app/state';
	import MapLibre from '$lib/MapLibre/MapLibre.svelte';
	import { createEntriesMapData, createFacilitiesMapData } from '$lib/components/Map/mapData.ts';
	import type { Facility } from '$lib/interfaces/facility.interface.js';
	import type { Entry } from '$lib/store/directoryStoreInterface.ts';

	// Two well-separated facilities, plus a pair 56m apart — the real distance
	// between the CPTS and the cabinet infirmier in Lyon 3, which is about 4px
	// at zoom 13. The close pair carries opposite tooltip_directions, which is
	// how two neighbours keep their popups from landing on each other.
	const facilities = [
		{
			uid: 'test-facility-1',
			name: 'Pôle Santé Gare',
			label: 'Pôle Santé Gare',
			slug: 'pole-sante-gare',
			address: {
				latitude: '43.492949',
				longitude: '-1.463151',
				zoom: 15,
				tooltip_direction: 'top'
			}
		},
		{
			uid: 'test-facility-2',
			name: 'Pharmacie Saint-Esprit',
			label: 'Pharmacie Saint-Esprit',
			slug: 'pharmacie-saint-esprit',
			address: {
				latitude: '43.497',
				longitude: '-1.469',
				zoom: 15,
				tooltip_direction: 'top'
			}
		},
		{
			uid: 'test-facility-3',
			name: 'CPTS Lyon 3ème',
			label: 'CPTS Lyon 3ème',
			slug: 'cpts-lyon-3eme',
			address: {
				latitude: '43.4945',
				longitude: '-1.4655',
				zoom: 15,
				tooltip_direction: 'top'
			}
		},
		{
			uid: 'test-facility-4',
			name: 'Cabinet infirmier',
			label: 'Cabinet infirmier',
			slug: 'cabinet-infirmier',
			address: {
				// ~56m from the one above, the Lyon 3 pair's real separation.
				latitude: '43.494577',
				longitude: '-1.464812',
				zoom: 15,
				tooltip_direction: 'bottom'
			}
		}
	] as unknown as Facility[];

	// The address book's popups, built by createEntriesMapData as the directory
	// builds them: a link to the entry, and its effector type under it.
	const entries = [
		{
			name: 'Camille Martin',
			entrySlug: 'camille-martin',
			effector_type: { name: 'Infirmier' },
			address: { latitude: '43.492949', longitude: '-1.463151', zoom: 15, tooltip_direction: 'top' }
		},
		{
			name: 'Pharmacie Saint-Esprit',
			entrySlug: 'pharmacie-saint-esprit',
			effector_type: { name: 'Pharmacien' },
			address: { latitude: '43.497', longitude: '-1.469', zoom: 15, tooltip_direction: 'top' }
		}
	] as unknown as Entry[];

	const data = $derived(
		page.url.searchParams.get('kind') === 'entries'
			? createEntriesMapData(entries, false, null)
			: createFacilitiesMapData(facilities, true, true)
	);
</script>

<!-- anchor=true: the linked popup is what the scenario measures. -->
<div id="test-map" class="h-96 w-full">
	<MapLibre
		{data}
		showTooltip={true}
		target={null}
	/>
</div>
