Feature: Separating a modal from the page behind it

  A modal asks for the user's whole attention: while it is open, the page
  behind it cannot be used. That has to be visible, not merely true.

  The dialogs are native <dialog> elements opened with showModal(), and a
  browser's default ::backdrop is very nearly transparent. Nothing therefore
  dimmed the page, and in dark mode the effect was worse than subtle: the
  dialog's own surface and the app bar behind it are both surface tones, so
  the modal read as another panel of the same page rather than as something
  laid over it.

  The project already has an answer for this — Skeleton's Modal and Drawer both
  darken the page with bg-surface-backdrop-token — so the native dialogs use
  the same treatment rather than inventing a second one.

  Rule: the page behind a modal is dimmed

    # Measured rather than eyeballed: the backdrop must actually paint
    # something, in both themes. A default ::backdrop is transparent and would
    # fail here.
    Scenario: An open modal darkens the page behind it
      Given I am signed in as an administrator, on an entry of this site
      When I open the avatar dialog for that entry
      Then the page behind the modal is dimmed

    # Dark mode is where the absence showed, so it is named explicitly: the
    # dialog surface and the app bar are close in colour there, and only the
    # backdrop separates them.
    Scenario: The page is dimmed in dark mode too
      Given the site is in dark mode
      And I am signed in as an administrator, on an entry of this site
      When I open the avatar dialog for that entry
      Then the page behind the modal is dimmed

    # The dialog has to stay legible against its own backdrop: dimming the page
    # is worthless if the modal is dimmed with it.
    Scenario: The modal itself is not dimmed
      Given I am signed in as an administrator, on an entry of this site
      When I open the avatar dialog for that entry
      Then the modal is brighter than the page behind it
