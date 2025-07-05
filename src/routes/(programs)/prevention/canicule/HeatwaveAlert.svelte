<script lang="ts">
	import { variables } from '$lib/utils/constants';
	import Fa from 'svelte-fa';
	import {
		faArrowRight,
		faXmark,
		faTemperatureHigh
	} from '@fortawesome/free-solid-svg-icons';
	import type { H } from 'vitest/dist/chunks/environment.d.C8UItCbf.js';
	
interface HeatwaveAlert  {
	start_time: string|null,
    end_time: string|null,
	risk_code: string|null
}
let visible = true;
let alert: HeatwaveAlert;

async function getHeatwaveAlert() {
	const url=`${variables.BASE_API_URI}/api/v1/heatwave/vigilance/84/`
  const result = await fetch(url);
  console.log(`${JSON.stringify(result)}`);
  const alert = await result.json() as HeatwaveAlert
  return alert;
}

    interface Risk { name: string, color: string};
	interface RiskDict {
		[key: number]: Risk;
	}
    const risk: RiskDict = {
		0: {
			name:"vert",
			color: "green",
		},
		1: {
			name:"jaune",
			color: "#f9ff00",
		},
		2: {
			name: "orange",
			color: "#f7a401"
		},
		3: {
        name: "rouge",
		color: "red"
		}
	};
	
	const riskColor = (alert: HeatwaveAlert)=>{
		const key = Number(alert.risk_code);
		return risk[key as keyof RiskDict].color;
	};
	const riskName = (alert: HeatwaveAlert)=>{
		const key = Number(alert.risk_code);
		return risk[key as keyof RiskDict].name;
	};

	const isActive = (alert: HeatwaveAlert) => {
		if (!alert.start_time || !alert.end_time || !alert.risk_code) {
			return false;
		}
		const stopEventDate = new Date(alert.end_time);
		return (new Date().getTime() < stopEventDate.getTime());
	}
	const formatDate = (date_iso: string)=>{
		const date = new Date(date_iso);
        return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
	timeStyle: "short",
    timeZone: 'Europe/Paris'
}).format(date);
	}
</script>

{#await getHeatwaveAlert()}
  <p>Loading alert...</p>
{:then alert}
{#if alert.start_time && alert.end_time && alert.risk_code && isActive(alert) && visible}
<div class="py-8 lg:py-10">
		<aside class="alert variant-ghost-warning">
			<!-- Icon -->
			<div class="hidden lg:block">
			<Fa icon={faTemperatureHigh} color={riskColor(alert)} size="3x" />
		</div>
			<!-- Message -->
			<div class="alert-message">
				<h3 class="h3"><span class="inline-block lg:hidden px-2"><Fa icon={faTemperatureHigh} color={riskColor(alert)}/></span>
				Vigilance {riskName} canicule </h3>
				<p>Vigilance météorologique canicule Vaucluse émise par Météo France le {formatDate(alert.start_time)} valable jusqu'au {formatDate(alert.end_time)}.</p>
			</div>
			<!-- Actions -->
			<div class="flex flex-wrap lg:flex-nowrap alert-actions gap-4 align-center place-content-center"><a href="/prevention/canicule" class="btn variant-ghost"><span><Fa icon={faArrowRight}/></span><span>Fiche prévention canicule</span></a>
			<button on:click={()=>visible=false} class="btn variant-ghost"><span><Fa icon={faXmark}/></span></div>
		</aside>
</div>
{/if}
{:catch error}
  <p>Error loading heatwave alert: {error.message}</p>
{/await}  

