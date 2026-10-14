<!-- A TimelineJS timeline. Browser only: TimelineJS writes to the DOM. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import './assets/timeline3/timeline.css';
	import type { TimelineData } from './chronology';

	let { data }: { data: TimelineData } = $props();

	onMount(async () => {
		const { Timeline } = await import('@medecinelibre/timelinejs/src/js/timeline/Timeline.mjs');
		new Timeline('timeline-embed', data);
	});
</script>

<main>
	<div id="timeline-embed" style="width: 100%; height: 700px"></div>
</main>
