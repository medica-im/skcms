Feature: Map popup links are readable in both colour modes

  The facility map draws one marker per facility, and each popup carries a link
  to that facility's page. Two stylesheets decide whether that link can be read,
  and neither knows about the other: the colour comes from Skeleton's `.anchor`
  (--color-primary-700, per-theme, and lighter in dark mode), while the popup
  card itself is drawn by MapLibre.

  MapLibre.svelte styles that card only to drop its padding and set
  `color: #000`. It never declares a background or a `color-scheme`, so the card
  is left to the browser's own dark-mode handling — and the engines disagree
  about what that means. Chromium paints it near-black, Firefox leaves it white,
  in every mode. The same link is therefore dark-on-dark on one engine and
  pale-on-white on the other, and neither was ever measured.

  This has to be a browser scenario rather than a component test. An earlier
  attempt mounted the component under headless vitest and read computed styles;
  MapLibre never painted (no WebGL, no tiles), so it measured an unrendered node
  and confidently reported white on both engines. The colour a reader meets is
  the colour that reaches the screen, so it is sampled from the rendered page.

  The bar is WCAG 2.1 AA for body text, 4.5:1 — the popup link is ~14px, so the
  3:1 large-text allowance does not apply.

  Runs in Chromium and in Firefox: this is a defect that only exists because the
  two engines resolve the same undeclared background differently, and a
  single-engine run is what let it through.

  Rule: the link contrasts with the card it sits on

    Scenario Outline: A facility popup link is legible in <mode> mode
      Given the site is in "<mode>" mode
      When I open the facility map
      And a facility marker popup is open
      Then the popup link contrasts with the popup background

      Examples:
        | mode  |
        | light |
        | dark  |

  # The popup must not be left to the browser's own dark-mode styling: that is
  # the difference between the two engines, so pinning it is what makes the
  # scenario above mean the same thing everywhere.
  Rule: the popup card declares its own colours

    Scenario Outline: The popup card is painted by the app, not the browser, in <mode> mode
      Given the site is in "<mode>" mode
      When I open the facility map
      And a facility marker popup is open
      Then the popup card has an explicit background colour

      Examples:
        | mode  |
        | light |
        | dark  |
