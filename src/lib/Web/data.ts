import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { variables } from '$lib/utils/constants.ts';
import type { Organization } from '$lib/interfaces/v2/organization';
import type { Effector, EffectorType } from '$lib/interfaces/v2/effector';
import type { FacilityV2 } from '$lib/interfaces/v2/facility.ts';
import type { Entry } from '$lib/store/directoryStoreInterface.ts';
import type { Commune, DepartmentOfFrance } from '$lib/interfaces/v2/facility.ts';

export const getEffectorTypes = async () => {
  const response = await fetch(`${ORIGIN}/api/v2/effector-types`)
  const data = (await response.json()) as Array<EffectorType>
  return data
}

export const getFacilities = async () => {
  const response = await fetch(`${ORIGIN}/api/v2/facilities`)
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