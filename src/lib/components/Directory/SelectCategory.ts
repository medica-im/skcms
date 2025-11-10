import { normalize } from '$lib/helpers/stringHelpers.ts';
import type { Type } from '$lib/store/directoryStoreInterface';
import type { EffectorType } from '$lib/interfaces/v2/effector';

export function getTypeItems(typesV2: EffectorType[], _filterText: string) {
    const types: Type[] = [];
    typesV2.forEach((t) => {
        const type: Type = {
            uid: t.uid,
            name: t.name_fr,
            label: t.label_fr,
            synonyms: t.synonyms_fr,
            definition: t.definition_fr,
            slug: t.slug_fr,
            labels: []
        }
        types.push(type)
    });
    return getItems(types, _filterText)
};

export function getItems(elements: Type[], _filterText: string) {
    return elements.filter((e) => {
        if (_filterText === "") {
            return true
        } else {
            const normalizedFilterText = normalize(_filterText);
            const name = normalize(e.name);
            const synonyms = e.synonyms?.map(s => normalize(s));
            return name.includes(normalizedFilterText) || synonyms?.some(s => s.includes(normalizedFilterText));
        }
    }
    ).sort(function (a, b) {
        return a.name.localeCompare(b.name);
    }).map(function (x) {
        let dct = { value: x.uid, label: x.name };
        return dct;
    });
};