import { variables } from '$lib/utils/constants';
import type { Organization } from '$lib/interfaces/organization.ts';

export const websiteSchema = (organization: Organization) => {
	const someds = [];
	for (let somed of organization.contact.socialnetworks) {
		someds.push(somed.url)
	}
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: organization.website_title,
		url: variables.BASE_URI,
		description: organization.website_description,
		sameAs: someds,
	}
};