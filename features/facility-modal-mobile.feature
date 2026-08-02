Feature: Editing a facility on a small screen

  A facility is edited through a modal dialog. It is open to administrators and
  to the owner or creator of an entry linked to the facility, who typically
  holds the "staff" role — see get_facility_users in the backend's
  api/routers/facilities.py, which passes those users to authorize_api.

  The form is long — name, slug, address, map, coordinates — so on a phone it
  has to stay readable and, above all, completable: whatever the screen height,
  the visitor must be able to reach the submit and cancel buttons.

  Two things break that on narrow screens: a dialog taller than the viewport
  with nothing to scroll, and labels sitting beside their inputs rather than
  above them, which leaves the fields too narrow to read.

  Rule: the people allowed to edit can open the dialog

    Scenario: An administrator can open the dialog
      Given I am signed in with the role "administrator"
      And I open a facility page
      Then the facility edit button is shown

    Scenario: A staff member who owns the entry can open the dialog
      Given I am signed in with the role "staff"
      And I own an entry linked to the facility
      And I open a facility page
      Then the facility edit button is shown

  Rule: the whole form can be reached on a phone

    Background:
      Given I am signed in with the role "administrator"
      And I open a facility page
      And I open the facility edit dialog

    Scenario: The dialog fits within the screen
      Given the screen is a phone
      Then the dialog is no taller than the screen

    Scenario: The form can be scrolled to the end
      Given the screen is a phone
      When I scroll the dialog to the bottom
      Then the submit button is visible
      And the cancel button is visible

    # The buttons are what makes the form completable, so they get their own
    # check: a dialog that scrolls but hides its actions is still a dead end.
    Scenario: The actions stay reachable on a short screen
      Given the screen is a short phone
      When I scroll the dialog to the bottom
      Then I can press the cancel button

  Rule: labels sit above their fields on narrow screens

    Background:
      Given I am signed in with the role "administrator"
      And I open a facility page
      And I open the facility edit dialog

    Scenario: A phone stacks each label over its input
      Given the screen is a phone
      Then each field label is above its input

    Scenario: A wide screen may place labels beside their inputs
      Given the screen is a desktop
      Then each field label is beside its input

  Rule: the form stays usable

    Background:
      Given I am signed in with the role "administrator"
      And I open a facility page
      And I open the facility edit dialog

    Scenario: Fields are wide enough to read on a phone
      Given the screen is a phone
      Then no form field is narrower than 120 pixels

    Scenario: The dialog never scrolls sideways
      Given the screen is a phone
      Then the dialog does not scroll horizontally
