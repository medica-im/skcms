<script lang="ts">
	import Fa from 'svelte-fa';
	import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

	let { text }: { text: string } = $props();
</script>

<aside
	role="note"
	class="variant-filled-warning flex items-center justify-center gap-2 px-4 py-1 text-center text-sm font-semibold"
	data-testid="demo-banner"
>
	<Fa icon={faCircleInfo} />
	<span>{text}</span>
</aside>
