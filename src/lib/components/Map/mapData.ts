import { entryPageUrl } from '$lib/utils/utils.ts';
import type { MapData } from '$lib/interfaces/mapData.interface.ts';
import type { Facility, Address } from '$lib/interfaces/facility.interface.ts';
import type { Facility as Facility2 } from '$lib/interfaces/v2/facility.ts';
import type { Entry, AddressFeature } from '$lib/store/directoryStoreInterface.ts';

export const createContactMapData = (address: Address, facilityName: string) => {
    return {
        lngLat: [parseFloat(address?.longitude||"0"), parseFloat(address?.latitude||"0")],
        zoom: address?.zoom || 15,
    } as {
        lngLat: [number, number],
        zoom: number
    }
};

export const createMapData = (address: Address, facilityName: string) => {
    const mapData: MapData[] = [];
    mapData.push({
        latLng: [Number(address?.latitude ?? 0), Number(address?.longitude ?? 0)],
        zoom: address?.zoom ?? 15,
        popup: null,
        tooltip: {
            text: facilityName,
            permanent: false,
            direction: "auto",
            opacity: 0.7
        }
    });
    return mapData;
};

export const createMapData2 = (facility: Facility2) => {
    const mapData: MapData[] = [
        {
            latLng: [Number(facility?.location?.latitude ?? 0), Number(facility?.location?.longitude ?? 0)],
            zoom: facility?.zoom ?? 0,
            popup: null,
            tooltip: {
                text: facility.name || "",
                permanent: false,
                direction: "auto",
                opacity: 0.7
            }
        }
    ];
    return mapData;
};


export const createFacilitiesMapData = (facilities: Facility[], tooltip = false) => {
    const points: MapData[] = [];
    facilities.forEach((item: Facility) => {
        points.push({
            latLng: [Number(item.address?.latitude ?? 0), Number(item.address?.longitude ?? 0)],
            zoom: item?.address?.zoom ?? 0,
            popup: null,
            tooltip: {
                text: item.address.tooltip_text || item.label || item.name,
                permanent: tooltip,
                direction: item.address.tooltip_direction || "auto",
                opacity: 0.7
            }
        });
    });
    return points;
};

function getTarget(addressFeature: AddressFeature) {
    return {
        latLng: [addressFeature.geometry.coordinates[1], addressFeature.geometry.coordinates[0]] as [number, number],
        zoom: 0,
        tooltip: {
            text: addressFeature.properties.label,
            permanent: false,
            direction: "auto",
            opacity: 0.7
        },
        iconUrl: "/icons/home.png",
        iconOptions: {
            iconUrl: "/icons/home.png",
            iconSize: [50, 50],
            iconAnchor: [25, 50],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
        }
    } as MapData
}

export const createEntriesMapData = (entries: Entry[], tooltip = false, target: AddressFeature | null, org_category: string | null = null, pathname: string, facility: string | null = null, types: string[] | null = null, tags: string[]|null = null, term: string | null = null, communes: string[] | null = null, department: {label: string, value: string} | null = null, situation: string | undefined, displayMap: boolean = false) => {
    const points: MapData[] = [];
    entries.forEach((entry: Entry) => {
        let tooltipHtml = `
        <b>${entry.address?.tooltip_text || entry.name}</b>
        <br>
        ${entry.effector_type.name}<br>`
        let popupHtml = `
        <a class="anchor" href="${entryPageUrl(entry, org_category, pathname, facility, types, tags, term, communes, department, situation, target, displayMap)}">
        ${entry.address?.tooltip_text || entry.name}
        </a>
        <br>
        <span style="color:#000000;">${entry.effector_type.name}</span>`

        points.push({
            latLng: [Number(entry.address?.latitude ?? 0), Number(entry.address?.longitude ?? 0)],
            zoom: entry?.address?.zoom ?? 0,
            popup: {
                text: popupHtml
            },
            tooltip: {
                text: tooltipHtml,
                permanent: tooltip,
                direction: entry.address?.tooltip_direction || "auto",
                opacity: 0.7
            }
        });
    });
    return points;
};