<script lang="ts">
    import { copy } from 'svelte-copy';
    import Fa from 'svelte-fa';
	import { faEnvelope } from '@fortawesome/free-regular-svg-icons';
	import { faCopy	} from '@fortawesome/free-solid-svg-icons';
    import { hyphenateUuid } from '$lib/utils/utils';
    let { data } = $props();
</script>

<button type="button" class="btn btn-sm variant-ghost" use:copy={hyphenateUuid(data)}>
    <span>-</span>
    <Fa icon={faCopy} />
</button>