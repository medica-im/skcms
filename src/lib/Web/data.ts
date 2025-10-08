import { variables } from '$lib/utils/constants.ts';
import type { Organization } from '$lib/interfaces/v2/organization';
import type { Effector, EffectorType } from '$lib/interfaces/v2/effector';
import type { FacilityV2 } from '$lib/interfaces/v2/facility.ts';
import type { Entry } from '$lib/store/directoryStoreInterface.ts';
import type { Commune, DepartmentOfFrance } from '$lib/interfaces/v2/facility.ts';

export const getEffectorTypes = async () => {
  const response = await fetch('/api/v2/effector-types')
  const data = (await response.json()) as Array<EffectorType>
  return data
}

export const getOrganizations = async () => {
  const response = await fetch('/api/v2/organizations')
  const data = (await response.json()) as Array<Organization>
  return data
}

export const getFacilities = async () => {
  const response = await fetch('/api/v2/facilities/')
  const data = (await response.json()) as Array<FacilityV2>
  return data
}

export const getFacility = async (uid: string) => {
  const response = await fetch(`/api/v2/facilities/${uid}`)
  const data = (await response.json()) as FacilityV2
  return data
}

export const getEntry = async (uid: string) => {
  const response = await fetch(`${variables.BASE_URI}/api/v1/entries/${uid}`)
  const data = (await response.json()) as Entry
  return data
}

export const getDepartments = async () => {
  const response = await fetch('/api/v2/departments')
  const data = (await response.json()) as Array<DepartmentOfFrance>
  return data
}

export const getCommunesByDpt = async (code: string): Promise<Commune[]> => {
  const response = await fetch(
    `/api/v2/communes?department=${code}`,
  )
  const data = (await response.json()) as Commune[]
  return data
}

export async function getEffectors(
  {effector_type = null, department_of_france = null, commune  = null, facility = null} : { effector_type?: string|null, department_of_france?: string|null, commune?: string|null, facility?: string|null} = {}): Promise<Effector[]> {
  const params: string[] = [];
  if (effector_type) {
    params.push(`effector_type=${effector_type}`)
  }
  if (department_of_france) {
    params.push(`department_of_france=${department_of_france}`)

  }
  if (commune) {
    params.push(`commune=${commune}`)
  }
  if (facility) {
    params.push(`facility=${facility}`)
  }
  let paramStr;
  if (params.length) {
    paramStr = `?${params.join("&")}`; 
  }
  console.log(paramStr);
  const response = await fetch(
    `/api/v2/effectors${paramStr ?? ''}`,
  )
  const data = (await response.json()) as Effector[]
  return data
}