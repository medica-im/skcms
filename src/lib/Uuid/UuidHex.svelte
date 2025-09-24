<script lang="ts">
    import { copy } from 'svelte-copy';
    import Fa from 'svelte-fa';
	import { faEnvelope } from '@fortawesome/free-regular-svg-icons';
	import { faCopy	} from '@fortawesome/free-solid-svg-icons';
    let { data } = $props();
</script>

<button type="button" class="btn btn-sm variant-ghost" use:copy={data}>
    <span>0x</span>
    <Fa icon={faCopy} />
</button>