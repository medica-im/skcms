Feature: The app bar's user controls line up

  Signed in, the end of the app bar carries the user menu and sign out side by
  side. They are read as one group, so their labels have to sit on the same
  baseline — a control whose text rides above its neighbour's reads as a
  rendering fault rather than a deliberate arrangement.

  Sign out is the one that drifted. It is not a plain button like the others:
  the auth library wraps it in its own form and button, and the slot inside was
  marked `lg:inline-block`. That overrode the flex display Skeleton's `btn`
  relies on to centre its contents, so the label and icon fell back onto a text
  baseline and sat 5px high — while the control's own box stayed exactly where
  it belonged.

  That last part is why the scenario measures the labels rather than the
  controls: both boxes were 44px tall at the same y throughout, so any
  assertion on the buttons themselves passed while the glitch was plain to see.

  Scenario: Sign out sits level with the user menu
    Given I am signed in with the role "staff"
    When I open the home page
    Then the sign out control is level with the user menu
    And the sign out control is as tall as the user menu
