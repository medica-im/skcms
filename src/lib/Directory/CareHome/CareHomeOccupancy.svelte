<script lang="ts">
	let { data } = $props();

	let count = 0;
	const dictionary = {
		regular_permanent_bed: {
			S: `${count} lit permanent`,
			P: `${count} lits permanents`
		},
		regular_temporary_bed: {
			S: `${count} lit temporaire`,
			P: `${count} lits temporaires`
		},
		alzheimer_permanent_bed: {
			S: `${count} lit Alzheimer permanent`,
			P: `${count} lits Alzheimer permanents`
		},
		alzheimer_temporary_bed: {
			S: `${count} lit Alzheimer temporaire`,
			P: `${count} lits Alzheimer temporaires`
		},
		uhr_permanent_bed: {
			S: `${count} lit UHR permanent`,
			P: `${count} lits UHR permanents`
		},
		uvpha_permanent_bed: {
			S: `${count} lit UVPHA permanent`,
			P: `${count} lits UVPHA permanents`
		},
		day_care: {
			S: `${count} place d'accueil de jour`,
			P: `${count} places d'accueil de jour`
		}
	};

	function label(k) {
		let count = data[k];
		const dictionary = {
			regular_permanent_bed: {
				S: `${count} lit permanent`,
				P: `${count} lits permanents`
			},
			regular_temporary_bed: {
				S: `${count} lit temporaire`,
				P: `${count} lits temporaires`
			},
			alzheimer_permanent_bed: {
				S: `${count} lit Alzheimer permanent`,
				P: `${count} lits Alzheimer permanents`
			},
			alzheimer_temporary_bed: {
				S: `${count} lit Alzheimer temporaire`,
				P: `${count} lits Alzheimer temporaires`
			},
			uhr_permanent_bed: {
				S: `${count} lit UHR permanent`,
				P: `${count} lits UHR permanents`
			},
			uvpha_permanent_bed: {
				S: `${count} lit UVPHA permanent`,
				P: `${count} lits UVPHA permanent`
			},
			day_care: {
				S: `${count} place d'accueil de jour`,
				P: `${count} places d'accueil de jour`
			}
		};
		if (count > 1) {
			return dictionary[k]['P'];
		} else {
			return dictionary[k]['S'];
		}
	}
</script>

<div class="grid grid-cols-1 justify-center gap-6">
	<h2 class="h2">Hébergement et accueil de jour</h2>
	<div class="grid grids-cols-1 lg:grid-cols-4 justify-center gap-6">
		<div class="flex lg:col-span-3">
			<div class="flex flex-wrap card variant-ringed p-6 gap-4">
				<h4 class="h4">Hébergement</h4>
				<div class="flex flex-wrap gap-6">
					{#if Object.keys(data).includes('regular_permanent_bed') || Object.keys(data).includes('regular_temporary_bed')}
						<div class="card p-2">
							<h5 class="h5">Standard</h5>
							<ul class="list">
								{#if Object.keys(data).includes('regular_permanent_bed')}
									<li>{label('regular_permanent_bed')}</li>
								{/if}
								{#if Object.keys(data).includes('regular_temporary_bed')}
									<li>{label('regular_temporary_bed')}</li>
								{/if}
							</ul>
						</div>

						<div class="card p-2">
							<h5 class="h5">Alzheimer</h5>
							<ul class="list">
								{#if Object.keys(data).includes('alzheimer_permanent_bed')}
									<li>{label('alzheimer_permanent_bed')}</li>
								{/if}
								{#if Object.keys(data).includes('alzheimer_temporary_bed')}
									<li>{label('alzheimer_temporary_bed')}</li>
								{/if}
							</ul>
						</div>

						<div class="card p-2">
							<h5 class="h5">UHR</h5>
							<ul class="list">
								{#if Object.keys(data).includes('uhr_permanent_bed')}
									<li>{label('uhr_permanent_bed')}</li>
								{/if}
							</ul>
						</div>

						<div class="card p-2">
							<h5 class="h5">UVPHA</h5>
							<ul class="list">
								{#if Object.keys(data).includes('uvpha_permanent_bed')}
									<li>{label('uvpha_permanent_bed')}</li>
								{/if}
							</ul>
						</div>
					{/if}
				</div>
			</div>
		</div>
		<div class="flex lg:col-span-1">
			<div class="flex flex-wrap card variant-ringed p-6 gap-4">
				<h4 class="h4">Accueil de jour</h4>
				<div class="flex flex-wrap gap-6">
					{#if Object.keys(data).includes('day_care')}
						{label('day_care')}
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
