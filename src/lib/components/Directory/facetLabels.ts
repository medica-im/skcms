import * as m from '$msgs';

/** The words the pages show for each value of the facets (backend/src/directory/facets.py). */
export const FACET_LABELS = {
	access: {
		anyone: m.DIRECTORY_ACCESS_ANYONE,
		referral: m.DIRECTORY_ACCESS_REFERRAL,
		professionals: m.DIRECTORY_ACCESS_PROFESSIONALS
	},
	accessModes: {
		phone: m.DIRECTORY_MODE_PHONE,
		walk_in: m.DIRECTORY_MODE_WALK_IN,
		appointment: m.DIRECTORY_MODE_APPOINTMENT,
		admission: m.DIRECTORY_MODE_ADMISSION,
		online: m.DIRECTORY_MODE_ONLINE,
		teleexpertise: m.DIRECTORY_MODE_TELEEXPERTISE,
		home_visit: m.DIRECTORY_MODE_HOME_VISIT
	},
	careLevels: {
		emergency: m.DIRECTORY_CARE_EMERGENCY,
		primary: m.DIRECTORY_CARE_PRIMARY,
		secondary: m.DIRECTORY_CARE_SECONDARY,
		tertiary: m.DIRECTORY_CARE_TERTIARY,
		prevention: m.DIRECTORY_CARE_PREVENTION
	},
	audiences: {
		students: m.DIRECTORY_AUDIENCE_STUDENTS,
		caregivers: m.DIRECTORY_AUDIENCE_CAREGIVERS,
		parents: m.DIRECTORY_AUDIENCE_PARENTS,
		women: m.DIRECTORY_AUDIENCE_WOMEN,
		men: m.DIRECTORY_AUDIENCE_MEN,
		lgbtqia: m.DIRECTORY_AUDIENCE_LGBTQIA,
		older_adults: m.DIRECTORY_AUDIENCE_OLDER_ADULTS
	}
} as const;

export const FACET_TITLES = {
	age: m.DIRECTORY_FACET_AGE,
	access: m.DIRECTORY_FACET_ACCESS,
	accessModes: m.DIRECTORY_FACET_MODES,
	careLevels: m.DIRECTORY_FACET_CARE_LEVELS,
	audiences: m.DIRECTORY_FACET_AUDIENCES
} as const;
