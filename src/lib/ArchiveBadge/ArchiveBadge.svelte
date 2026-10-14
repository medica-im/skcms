<script lang="ts">
	import Fa from 'svelte-fa';
	import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
</script>

<span
	class="badge variant-ringed-tertiary"
	role="img"
	aria-label={m.ARCHIVED()}
	title={m.ARCHIVED()}
>
	<Fa icon={faClockRotateLeft} />
</span>
