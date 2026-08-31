<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { ORIGIN } from '$lib/utils/origin.ts';
	import Fa from 'svelte-fa';
	import { faArrowRight, faXmark, faTemperatureHigh } from '@fortawesome/free-solid-svg-icons';

	let { link }: { link: boolean } = $props();

	const CANICULE_PATH = '/prevention/canicule';
	let isOnCaniculePage = $derived(page.url.pathname === CANICULE_PATH);

	interface HeatwaveAlert {
		start_time: string | null;
		end_time: string | null;
		risk_code: string | null;
	}
	// Closing the banner has to outlive a reload, but only for an hour — the
	// alert itself can last days. localStorage rather than a cookie: the server
	// never needs this, so there is no reason to send it with every request.
	const DISMISSED_KEY = 'heatwave-alert-dismissed-until';
	const DISMISS_DURATION_MS = 60 * 60 * 1000;

	function dismissedUntil(): number {
		if (!browser) return 0;
		return Number(window.localStorage.getItem(DISMISSED_KEY)) || 0;
	}

	let visible: boolean = $state(dismissedUntil() <= Date.now());
	let alert: HeatwaveAlert | null;

	function dismiss() {
		visible = false;
		if (browser) {
			window.localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DURATION_MS));
		}
	}

	async function getHeatwaveAlert() {
		const department = page.data.organization.department.code;
		const url = `${ORIGIN}/api/v1/heatwave/warning/${department}/`;
		if (import.meta.env.DEV) {
			console.log(url);
		}
		const result = await fetch(url);
		if (result.ok) {
			alert = (await result.json()) as HeatwaveAlert;
		} else {
			if (import.meta.env.DEV) {
				console.log(result);
			}
			alert = null;
		}
		return alert;
	}

	interface Risk {
		name: string;
		color: string;
	}
	interface RiskDict {
		[key: number]: Risk;
	}
	const risk: RiskDict = {
		1: {
			name: 'vert',
			color: 'green'
		},
		2: {
			name: 'jaune',
			color: '#f9ff00'
		},
		3: {
			name: 'orange',
			color: '#f7a401'
		},
		4: {
			name: 'rouge',
			color: 'red'
		}
	};

	const riskColor = (alert: HeatwaveAlert) => {
		const key = Number(alert.risk_code);
		return risk[key as keyof RiskDict].color;
	};
	const riskName = (alert: HeatwaveAlert) => {
		const key = Number(alert.risk_code);
		return risk[key as keyof RiskDict].name;
	};

	const isActive = (alert: HeatwaveAlert) => {
		if (!alert.start_time || !alert.end_time || !alert.risk_code) {
			return false;
		}
		const stopEventDate = new Date(alert.end_time);
		return new Date().getTime() < stopEventDate.getTime();
	};
	const formatDate = (date_iso: string) => {
		const date = new Date(date_iso);
		return new Intl.DateTimeFormat('fr-FR', {
			dateStyle: 'full',
			timeStyle: 'short',
			timeZone: 'Europe/Paris'
		}).format(date);
	};
</script>

<!--
	Dismissed banners skip the request altogether: there is nothing to show, so
	fetching the alert only to hide it would also flash the dev placeholder on
	every reload.
-->
{#if visible}
	{#await getHeatwaveAlert()}
		{#if import.meta.env.DEV}
			<p data-testid="heatwave-alert-loading">Loading alert...</p>
		{/if}
	{:then alert}
		{#if alert && alert.start_time && alert.end_time && alert.risk_code && isActive(alert)}
			<aside
				data-testid="heatwave-alert"
				class="alert border-4 max-w-3xl mx-auto"
				style="border-color:{riskColor(alert)}"
			>
			<!-- Icon -->
			<div class="hidden lg:block">
				<Fa style="font-size:3em" icon={faTemperatureHigh} color={riskColor(alert)} />
			</div>
			<!-- Message -->
			<div class="alert-message">
				<h3 class="h3 text-center">
					<span class="inline-block lg:hidden px-1"
						><Fa icon={faTemperatureHigh} color={riskColor(alert)} /></span
					>
					Vigilance {riskName(alert)} canicule
				</h3>
				<p>
					Vigilance météorologique canicule {page.data.organization.department.name} émise par Météo France
					le {formatDate(alert.start_time)} valable jusqu'au {formatDate(alert.end_time)}.
				</p>
			</div>
			<!-- Actions -->
			<div
				class="flex flex-wrap lg:flex-nowrap alert-actions gap-4 align-center place-content-center"
			>
				{#if !isOnCaniculePage}
					{#if link}
						<a href={CANICULE_PATH} class="btn variant-ghost">
							<span><Fa icon={faArrowRight} /></span>
							<span>Fiche prévention canicule</span>
						</a>
					{:else}
						<a
							href="https://vigilance.meteofrance.fr/fr/{page.data.organization.department.slug}"
							target="_blank"
							rel="noopener noreferrer"
							class="btn variant-ghost"
						>
							<span><Fa icon={faArrowRight} /></span>
							<span
								>VIGILANCE METEO {page.data.organization.department.name.toUpperCase()} ({page.data
									.organization.department.code})</span
							>
						</a>
					{/if}
				{/if}
				<button
					onclick={dismiss}
					data-testid="heatwave-alert-close"
					aria-label="Fermer l'alerte canicule"
					class="btn variant-ghost"><span><Fa icon={faXmark} /></span></button
				>
			</div>
		</aside>
	{/if}
	{:catch error}
		{#if import.meta.env.DEV}
			<p>Error loading heatwave alert: {error.message}</p>
		{/if}
	{/await}
{/if}
