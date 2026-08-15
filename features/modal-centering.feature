Feature: A modal opens in the middle of the screen

  Every dialog in the admin UI is a native <dialog> opened with showModal(),
  and a browser centres those on its own. So a modal that opens against the
  left edge is not a quirk of that one component: something is overriding a
  default that costs nothing to get right.

  It showed on the phone controls — creating a phone opened a box in the middle
  of the screen, editing or deleting one opened a box against the left edge —
  but the entry page carries a dozen of these dialogs across phones, emails,
  websites, social networks and the effector itself, all built from the same
  Dialog component and all sized differently.

  So this does not name three dialogs. It opens every create, edit and delete
  control the entry page offers and checks each one, because a rule written
  against a list stops covering the thing it was written for the moment
  somebody adds a fourteenth dialog.

  Measured rather than eyeballed: a dialog is centred when the gap to its left
  and the gap to its right are equal. That definition holds whatever the
  dialog's width, which matters here because these widths disagree — one asks
  for 28rem, another for nothing at all, a third for a fixed height and no
  width.

  Rule: every dialog on an entry page is horizontally centred

    # One scenario, every control. The failure message names the dialog that
    # was off-centre and by how much, so a sweep is as diagnosable as a
    # scenario per component would be — without going stale.
    Scenario: Every create, edit and delete dialog opens centred
      Given I am signed in as an administrator, on an entry with contact details
      Then every dialog on the page opens horizontally centred

  Rule: a dialog fits the screen it opens on

    # Centring a box wider than the viewport hides half of it, so the two rules
    # are checked together: a dialog that overflows is not saved by being
    # symmetrical about the centre.
    Scenario: No dialog is wider than the screen
      Given I am signed in as an administrator, on an entry with contact details
      Then every dialog on the page fits within the viewport
