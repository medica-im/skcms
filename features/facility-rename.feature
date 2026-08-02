Feature: Renaming a facility

  A facility is renamed through its edit dialog. Once the change is confirmed
  and the dialog closed, the new name has to appear straight away — on the page
  being edited, and on any other page listing that facility — without the
  visitor reloading or knowing to press refresh.

  The facility URL is built from its slug, so a rename that leaves the slug
  behind lets two facilities claim the same address. That has already happened
  in the field: renaming "Cabinet de kinésithérapie du Bois" to
  "Cabinet de kinésithérapie du Bois Vert" left two buttons in the facility
  list pointing at the same page.

  Background:
    Given I am signed in with the role "administrator"

  Rule: the new name shows immediately on the facility page

    Scenario: The heading updates without a reload
      Given I open the facility page for "Pharmacie des Félibres"
      When I rename the facility to "Pharmacie des Félibres Test"
      And I close the edit dialog
      Then the facility page shows "Pharmacie des Félibres Test"
      And I have not reloaded the page

  Rule: other pages listing the facility show the new name

    Scenario: The home page facility list is up to date
      Given I open the facility page for "Pharmacie des Félibres"
      When I rename the facility to "Pharmacie des Félibres Test"
      And I close the edit dialog
      And I navigate to the home page
      Then the facility list shows "Pharmacie des Félibres Test"

  Rule: two facilities never share one address

    # The slug is what /sites/<slug> resolves, so duplicates send both buttons
    # to the same facility — the visitor cannot reach one of them at all.
    Scenario: Every facility button points to its own page
      Given I open the home page
      Then no two facility buttons share the same link

    Scenario: Renaming a facility does not collide with another slug
      Given I open the facility page for "Pharmacie des Félibres"
      When I rename the facility to "Pharmacie des Félibres Test"
      And I close the edit dialog
      And I open the home page
      Then no two facility buttons share the same link
