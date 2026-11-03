/** The tabs of the invitation email page, in the order they are shown. */
export const TABS = ['template', 'preview', 'images'] as const;

/** The tab an address names; the first one when it names none or an unknown one. */
export function tabFromAddress(search: string): number {
	return Math.max(0, TABS.indexOf(new URLSearchParams(search).get('tab') as (typeof TABS)[number]));
}

/**
 * `address` with `tab` in it. The first tab is the default and stays out of the
 * address, so a page opened without ?tab= and one opened on the first tab have
 * the same address.
 */
export function addressForTab(address: string, tab: number): string {
	const url = new URL(address);
	if (tab === 0) url.searchParams.delete('tab');
	else url.searchParams.set('tab', TABS[tab]);
	return url.href;
}
