/**
 * A term's explanation: the definition, and an optional second paragraph.
 *
 * A tuple rather than a bare string[], so `entry[0]` is known to exist — every
 * term has a definition — while the elaboration stays optional. That is what
 * lets a caller read the first element without a possibly-undefined check and
 * still be told to guard the second.
 */
export type Definition = [definition: string, elaboration?: string];

/**
 * Every term the site explains, keyed by the word as it is written.
 *
 * A synonym is a key whose definition is another key — `MSP` points at `Maison
 * de santé pluriprofessionnelle` — which is what Def.svelte follows to reach
 * the real text. So a value is either the explanation itself or a redirection
 * to the key that holds it, and a reader of this file cannot tell which
 * without looking up the target.
 *
 * Typed as a record keyed by string, not left to inference: callers look a
 * term up by a string they hold at runtime, and the inferred literal type
 * admitted only the four keys written here — every lookup in Def.svelte was an
 * implicit-any error.
 */
export type Lexicon = Record<string, Definition>;

const espK = 'Équipe de soins primaires';
const espV0 = `Une équipe de soins primaires est un ensemble de professionnels de santé constitué autour de médecins généralistes de premier recours, choisissant d'assurer leurs activités de soins de premier recours sur la base d'un projet de santé qu'ils élaborent. Elle peut prendre la forme d'un centre de santé ou d'une maison de santé.`;
const espV1 = `L'équipe de soins primaires contribue à la structuration des parcours de santé. Son projet de santé a pour objet, par une meilleure coordination des acteurs, la prévention, l'amélioration et la protection de l'état de santé de la population, ainsi que la réduction des inégalités sociales et territoriales de santé.`;
const mspV0 = `Les maisons de santé pluriprofessionnelles sont des structures pluridisciplinaires où travaillent de manière coordonnée médecins et auxiliaires médicaux.`;
const mspV1 = `L’idée est de créer un espace dédié à la coordination des soins au plus près de la population grâce au partage de compétences.`;

const dict: Lexicon = {
	MSP: ['Maison de santé pluriprofessionnelle'],
	ESP: ['Équipe de soins primaires'],
	[espK]: [espV0, espV1],
	'Maison de santé pluriprofessionnelle': [mspV0, mspV1]
};

export default dict;

/**
 * The entry that actually holds the text for a term, following one synonym.
 *
 * `MSP` gives `['Maison de santé pluriprofessionnelle']`, whose single element
 * is itself a key — so the definition to show is the one stored under that
 * key. A term that is not a synonym resolves to itself.
 *
 * One hop, deliberately: a synonym pointing at a synonym is a data mistake
 * rather than a case to support, and following a chain would loop forever on
 * two terms pointing at each other.
 */
export const resolve = (
	term: string,
	lexicon: Lexicon = dict
): { term: string; definition: Definition } | undefined => {
	const entry = lexicon[term];
	if (!entry) return undefined;
	const target = entry[0];
	if (target in lexicon) return { term: target, definition: lexicon[target] };
	return { term, definition: entry };
};
