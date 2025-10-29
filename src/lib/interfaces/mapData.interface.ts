interface Tooltip {
    text: string,
    permanent: boolean,
    direction: string,
    opacity: number,
}

export interface MapData {
    latLng: [number, number];
    zoom?: number;
    tooltip?: Tooltip;
    popup: {
        text: string;
    }|null,
    iconUrl?: string,
    iconOptions?: {
        iconUrl: string,
        iconSize: [number, number],
        iconAnchor: [number, number],
        popupAnchor: [number, number],
        tooltipAnchor: [number, number],
    }
}