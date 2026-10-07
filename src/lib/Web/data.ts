import { ORIGIN } from '$lib/utils/origin.ts';
import type { EffectorType } from '$lib/interfaces/v2/effector';
import type { FacilityV2 } from '$lib/interfaces/v2/facility.ts';
import type { Commune, DepartmentOfFrance } from '$lib/interfaces/v2/facility.ts';

/**
 * 'directory': only the categories this site's directory offers at entry
 * creation (every one when it names none); 'all': every category.
 */
export const getEffectorTypes = async (scope: 'all' | 'directory' = 'all') => {
  const query = scope === 'directory' ? '?scope=directory' : ''
  const response = await fetch(`${ORIGIN}/api/v2/effector-types${query}`)
  const data = (await response.json()) as Array<EffectorType>
  return data
}

/**
 * The facilities the entry creation form offers. 'all' (superusers only, the
 * backend refuses anyone else) is every site's, for a new project's entry.
 */
export const getFacilities = async (scope: 'site' | 'all' = 'site') => {
  const query = scope === 'all' ? '?scope=all' : ''
  const response = await fetch(`${ORIGIN}/api/v2/facilities${query}`)
  const data = (await response.json()) as Array<FacilityV2>
  return data
}

export const getFacility = async (uid: string) => {
  const response = await fetch(`${ORIGIN}/api/v2/facilities/${uid}`)
  const data = (await response.json()) as FacilityV2
  return data
}

export const getDepartments = async () => {
  const response = await fetch(`${ORIGIN}/api/v2/departments`)
  const data = (await response.json()) as Array<DepartmentOfFrance>
  return data
}

export const getCommunesByDpt = async (code: string): Promise<Commune[]> => {
  const response = await fetch(
    `${ORIGIN}/api/v2/communes?department=${code}`,
  )
  const data = (await response.json()) as Commune[]
  return data
}