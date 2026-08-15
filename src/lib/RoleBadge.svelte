<script lang="ts">
	import { roleLabel, roleShortLabel, roleVariant } from '$lib/roles';

	/**
	 * A user's role, as a coloured badge.
	 *
	 * Abbreviated by default, because the common case is a fixed grid track in a
	 * card row — "Utilisateur enregistré" there either wraps to two lines or
	 * forces the whole column wider, on the wide screens where the table is the
	 * point. The full wording stays reachable through the accessible name and,
	 * for a mouse, the tooltip.
	 *
	 * Short label, colour and full wording have to agree with each other, and
	 * before this component they were written out by hand in six places. The
	 * last time these maps were duplicated they drifted: the backend's own copy
	 * still says "Équipe" where the UI says "Équipier".
	 *
	 * @param full     spell the role out — detail pages and anywhere with room.
	 * @param uniform  take the same width whatever the role, so a column of
	 *                 badges lines up. For table-like rows; leave it off for a
	 *                 badge sitting inline after a name.
	 */
	let {
		role,
		full = false,
		uniform = false,
		class: klass = ''
	}: { role: string; full?: boolean; uniform?: boolean; class?: string } = $props();

	const long = $derived(roleLabel(role));
	const label = $derived(full ? long : roleShortLabel(role));

	// Only when the badge is showing an abbreviation. A tooltip and an
	// accessible name repeating the visible text make a screen reader say it
	// twice, and a long-press on a phone reveal what is already on screen.
	const expansion = $derived(full ? undefined : long);

	// 9ch fits the longest abbreviation in either language — "Équipier" (8) in
	// French, "Admin"/"Staff" (5) in English — without anybody maintaining a
	// per-language width table. A fixed pixel value would be a fourth copy of
	// the same knowledge, and would clip the first time a label changed.
	// inline-flex, not just a min-width: Skeleton's .badge computes to
	// `display: inline` here, and min-width does nothing to an inline box — the
	// badges went on shrink-wrapping with the class silently applied.
	const width = $derived(
		uniform ? 'inline-flex justify-center min-w-[9ch]' : 'w-fit'
	);
</script>

<span
	class="badge {roleVariant(role)} badge-sm {width} {klass}"
	title={expansion}
	aria-label={expansion}
>
	{label}
</span>
