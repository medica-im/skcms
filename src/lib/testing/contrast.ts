/** WCAG AA: body text against its background. */
export const AA_TEXT = 4.5;

/** The first opaque background at or above `el`; the page's own when none is. */
export const paintedBehind = (el: Element): string => {
	for (let node: Element | null = el; node; node = node.parentElement) {
		const bg = getComputedStyle(node).backgroundColor;
		if (!/rgba\(.*,\s*0\)$/.test(bg) && bg !== 'transparent') return bg;
	}
	return getComputedStyle(document.body).backgroundColor;
};

/** WCAG contrast ratio of two `rgb()` colours. */
export const contrast = (a: string, b: string): number => {
	const lum = (c: string) => {
		const [r, g, bl] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map((v) => {
			const s = v / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
	};
	const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

/** How `el`'s own text reads against what is painted behind it. */
export const legibility = (el: Element): number => contrast(getComputedStyle(el).color, paintedBehind(el));

/** Runs `check` with the page in `scheme`, as the theme toggle sets it, and puts light back after. */
export const inScheme = async (scheme: 'light' | 'dark', check: () => Promise<void>): Promise<void> => {
	document.documentElement.classList.toggle('dark', scheme === 'dark');
	try {
		await check();
	} finally {
		document.documentElement.classList.remove('dark');
	}
};
