import { page } from '$app/state';

export const org = {
    // We use a getter so it re-evaluates whenever page.data changes
    get isAsso() {
        return page.data.organization?.legal_entity?.type === "ASSO";
    },
    get displayAsso() {
        return page.data.directory?.setting?.display_association;
    }
};