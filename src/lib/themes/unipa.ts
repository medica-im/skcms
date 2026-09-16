import type { CustomThemeConfig } from '@skeletonlabs/tw-plugin';

/**
 * A theme for the directory embedded in unipa.fr.
 *
 * The app is a section of that WordPress site, so it should not arrive in the
 * middle of it wearing a different palette. Derived from wintry — the default
 * everywhere else — with the parent site's own colours and fonts substituted,
 * so anything not stated here still behaves the way every other site does.
 *
 * Colours come from the WordPress theme's declared palette rather than from
 * sampling a screenshot:
 *
 *     --wp--preset--color--brand-color: #7eb3ab   (the muted teal)
 *     light #b6e2dd, dark #60928b                 (its own two variants)
 *     --wp--preset--color--dark-strong: #24262B   (headings, footer)
 *     --wp--preset--color--dark-light:  #32353C
 *     --wp--preset--color--grey-strong: #6A707E
 *
 * The ramps interpolate white → light → base → dark → near-black, so the 500
 * step is exactly the brand colour and the rest stay on the same hue.
 *
 * Fonts are the two the parent site uses: Poppins for body text, Rubik for
 * titles (its own markup calls that class `font-titles`). The parent loads them
 * from Google Fonts; this app takes them from @fontsource packages instead,
 * following the reasoning already written up for Inter in app.postcss — no
 * third-party request on every page load, nothing leaked to a CDN, and the
 * version pinned in package.json like any other dependency.
 *
 * Colours and fonts only, deliberately. Matching the WordPress theme's spacing,
 * borders and component shapes is a separate piece of work, and doing it by
 * halves here would leave the app looking neither like itself nor like its
 * host.
 */
export const unipaTheme: CustomThemeConfig = {
	name: 'unipa',
	properties: {
		// =~= Typography =~=
		// Fontsource registers Rubik's variable build as `Rubik Variable`, not
		// `Rubik` — naming the plain family here is a silent miss that falls
		// through to the next stack entry, which is the trap the Inter note in
		// app.postcss describes. Poppins is a static package and keeps its name.
		'--theme-font-family-base': "'Poppins', system-ui, -apple-system, sans-serif",
		'--theme-font-family-heading': "'Rubik Variable', 'Rubik', system-ui, sans-serif",
		'--theme-font-color-base': '36 38 43',
		'--theme-font-color-dark': '255 255 255',
		// Wintry's own values: the parent site's buttons are rectangular, but
		// changing radii is a shape decision, not a colour one.
		'--theme-rounded-base': '9999px',
		'--theme-rounded-container': '6px',
		'--theme-border-base': '1px',
		// =~= Contrast on filled surfaces =~=
		// The brand teal is light enough that black text sits on it comfortably;
		// the dark neutrals need white.
		'--on-primary': '0 0 0',
		'--on-secondary': '255 255 255',
		'--on-tertiary': '0 0 0',
		'--on-success': '0 0 0',
		'--on-warning': '0 0 0',
		'--on-error': '255 255 255',
		'--on-surface': '255 255 255',
		// =~= Primary: the brand teal #7eb3ab =~=
		'--color-primary-50': '237 248 246',
		'--color-primary-100': '218 240 238',
		'--color-primary-200': '197 232 228',
		'--color-primary-300': '182 226 221',
		'--color-primary-400': '148 198 191',
		'--color-primary-500': '126 179 171',
		// 700 and below are darkened away from a pure interpolation of the
		// brand colour. Skeleton's `.anchor` paints link text with
		// primary-700, and the interpolated value (96 146 139) gives 3.05:1 on
		// this theme's light surface — under the 4.5:1 the project holds itself
		// to for body text (features/map-popup-contrast.feature). The hue and
		// saturation are the brand's; only lightness moves, so a link still
		// reads as the same colour as everything else here.
		'--color-primary-600': '79 135 127',
		'--color-primary-700': '68 116 109',
		'--color-primary-800': '53 90 84',
		'--color-primary-900': '38 64 60',
		// =~= Secondary: the dark neutral #32353C =~=
		'--color-secondary-50': '232 232 233',
		'--color-secondary-100': '209 210 211',
		'--color-secondary-200': '181 182 185',
		'--color-secondary-300': '163 164 167',
		'--color-secondary-400': '95 97 103',
		'--color-secondary-500': '50 53 60',
		'--color-secondary-600': '43 46 52',
		'--color-secondary-700': '36 38 43',
		'--color-secondary-800': '27 28 32',
		'--color-secondary-900': '20 21 24',
		// =~= Tertiary: wintry's indigo, kept as the third accent =~=
		'--color-tertiary-50': '238 242 255',
		'--color-tertiary-100': '224 231 255',
		'--color-tertiary-200': '199 210 254',
		'--color-tertiary-300': '165 180 252',
		'--color-tertiary-400': '129 140 248',
		'--color-tertiary-500': '99 102 241',
		'--color-tertiary-600': '79 70 229',
		'--color-tertiary-700': '67 56 202',
		'--color-tertiary-800': '55 48 163',
		'--color-tertiary-900': '49 46 129',
		// =~= Success / warning / error: wintry's, unchanged =~=
		'--color-success-50': '240 253 244',
		'--color-success-100': '220 252 231',
		'--color-success-200': '187 247 208',
		'--color-success-300': '134 239 172',
		'--color-success-400': '74 222 128',
		'--color-success-500': '34 197 94',
		'--color-success-600': '22 163 74',
		'--color-success-700': '21 128 61',
		'--color-success-800': '22 101 52',
		'--color-success-900': '20 83 45',
		'--color-warning-50': '254 252 232',
		'--color-warning-100': '254 249 195',
		'--color-warning-200': '254 240 138',
		'--color-warning-300': '253 224 71',
		'--color-warning-400': '250 204 21',
		'--color-warning-500': '234 179 8',
		'--color-warning-600': '202 138 4',
		'--color-warning-700': '161 98 7',
		'--color-warning-800': '133 77 14',
		'--color-warning-900': '113 63 18',
		'--color-error-50': '254 242 242',
		'--color-error-100': '254 226 226',
		'--color-error-200': '254 202 202',
		'--color-error-300': '252 165 165',
		'--color-error-400': '248 113 113',
		'--color-error-500': '239 68 68',
		'--color-error-600': '220 38 38',
		'--color-error-700': '185 28 28',
		'--color-error-800': '153 27 27',
		'--color-error-900': '127 29 29',
		// =~= Surface: the grey neutrals, resolving to #24262B at the dark end =~=
		'--color-surface-50': '238 239 240',
		'--color-surface-100': '222 223 226',
		'--color-surface-200': '201 204 209',
		'--color-surface-300': '188 191 197',
		'--color-surface-400': '139 144 154',
		'--color-surface-500': '106 112 126',
		'--color-surface-600': '71 75 84',
		'--color-surface-700': '36 38 43',
		'--color-surface-800': '27 28 32',
		'--color-surface-900': '20 21 24'
	}
};
