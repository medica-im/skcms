Feature: A facility's web address

  A facility is reached at /sites/<address>, so no two facilities may share an
  address, and an address that reads badly is a problem for the place it names.
  The forms therefore show the address and let people change it, but confirm
  only an address no other facility holds.

  A facility already published keeps its address unless somebody changes it on
  purpose: every link already shared, and every search result, points there, and
  facilities have no redirects. Renaming a facility is not a reason to move it.

  Whether an address is free is checked as it is typed, and again when the form
  is saved. The first is a convenience, the second the guarantee: two people can
  pick the same address at the same moment.

  Background:
    Given I am signed in with the role "administrator"

  Rule: the saved address is shown, and a rename leaves it alone

    Scenario: The address is shown and can be kept
      Given a facility of this site
      And I open the edit dialog of that facility
      Then the dialog shows the facility's address
      And the address is unchanged

    Scenario: Renaming a facility does not change its address
      Given a facility of this site
      And I open the edit dialog of that facility
      When I rename it to "Cabinet renommé"
      And I submit the facility edit dialog
      Then the facility is still at its address

  Rule: an address another facility holds is refused, and free ones are offered

    Scenario: Taking another facility's address
      Given a facility of this site
      And another facility holds an address
      And I open the edit dialog of that facility
      When I change its address to the one the other facility holds
      Then I am told the address is already used
      And I am offered free addresses
      And the facility edit cannot be submitted

    Scenario: Picking an offered address
      Given a facility of this site
      And another facility holds an address
      And I open the edit dialog of that facility
      And I change its address to the one the other facility holds
      When I choose the first offered address
      Then the address is available
      And I am warned that the old address stops working
      And the facility edit can be submitted

  Rule: a free address of one's own choice is saved

    Scenario: Changing to a free address
      Given a facility of this site
      And I open the edit dialog of that facility
      When I change its address to a free one
      Then the address is available
      When I submit the facility edit dialog
      Then the facility is stored at the new address
