import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

export interface Variables {
	//readonly DEV: boolean
	readonly BASE_CMS_API_URI: string;
	readonly BASE_URI: string;
	readonly GHOST_API_KEY: string;
	readonly DEFAULT_LANGUAGE: string;
	readonly TIMELINE: boolean;
	readonly BLOG_URI: string;
	readonly NOINDEX: boolean;
	readonly INPUT_GEOCODER: boolean;
	readonly INPUT_SITUATION: boolean;
	readonly INPUT_COMMUNE: boolean;
	readonly INPUT_CATEGORY: boolean;
	readonly INPUT_FACILITY: boolean;
	readonly INPUT_SEARCH: boolean;
	readonly ENTRIES_LIMIT: number;
	readonly SITUATIONS_TTL: number;
}

export interface ProgramsNavLinks {
	[key: string]: Nav
}

export interface MenuNavCat {
	id: string;
	title: {
		en: string;
		fr: string;
	};
	docsIcon: string;
	list: Nav[];
}

export interface Link {
	href: string,
	label: string,
	keywords: string,
	icon: object|null,
	category?: string,
	active?: boolean,
	preload?: string
};

export interface Nav {
	id: string,
	title: {
		en: string,
	    fr: string
	},
	/**
	 * The category's own landing page, when it has one.
	 *
	 * Optional because not every category is a place. A programme category has
	 * a page introducing it and listing its programmes; a section like "Maison
	 * de santé" is only a heading over pages that explain themselves, and what
	 * an MSP is belongs on its "À propos" page rather than a second page above
	 * it. Given an href the heading is a link; without one it is plain text.
	 *
	 * A category that names an href it has no route for is the failure this
	 * replaces: the menu rendered a link on every page of the section, and all
	 * of them 404ed.
	 */
	href?: string,
	icon?: IconDefinition,
	list: Link[]
};