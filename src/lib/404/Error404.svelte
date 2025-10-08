<script lang="ts">
	import * as m from "$msgs";
</script>

<div class="card variant-ringed p-6 m-6">
	<div class="d-flex align-items-center justify-content-center">
		<div class="grid column-1 place-items-center text-center gap-3">
			<h1 class="h1">404</h1>
			<p>
				<span class="text-danger">{m.ERROR404_OOPS()}</span>
				{m.ERROR404_PAGENOTFOUND()}
			</p>
			<p>
				{m.ERROR404_DOESNOTEXIST()}
			</p>
			<a href="/" class="btn variant-ghost-primary w-min">{m.ERROR404_HOME()}</a>
		</div>
	</div>
</div>
