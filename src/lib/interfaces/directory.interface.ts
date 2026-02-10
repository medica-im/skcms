export interface Directory {
  name: string;
  display_name: string;
  presentation: string;
  slug: string;
  postal_codes: string[],
  department_default: boolean;
  commune_default: boolean;
  inputField: {
    category: boolean|null;
    commune: boolean|null;
    department: boolean|null;
    facility: boolean|null;
    geocoder: boolean|null;
    organization: boolean|null;
    search: boolean|null;
    situation: boolean|null;
    tag: boolean|null;
  },
  setting: {
    sort_category_display: string;
    display_facility_organization: boolean|null;
  }
}