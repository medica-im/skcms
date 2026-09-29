@entry-creation-flow @entry-type-edit
Feature: Changing an entry's occupation

  An entry is (person, occupation, place). A wrong occupation used to need a
  hand-written database script; it can now be corrected from the entry page,
  in edit mode, next to the occupation -- but only while the entry is young
  enough that nobody has come to rely on it:

  * a superuser, at any time;
  * an administrator, within the organization's administrator window (30
    days unless the organization says otherwise);
  * the entry's creator or one of its owners, within the organization's
    connected window (7 days unless the organization says otherwise).

  Past the window the pen is barred, and says why: the way to list the person
  under another occupation is then a new entry with the same place and
  person -- offered prefilled -- and this one deactivated.

  The occupation is part of the entry's address, so a change gives the page a
  new one; the old address keeps leading to it.

  Background:
    Given a person and a facility created by a staff member of this site
    And an entry for them as "infirmière", created by that staff member

  Scenario: The creator corrects the occupation of a new entry
    Given I am signed in with the role "staff"
    When I open that entry in edit mode
    And I change its occupation to "médecin généraliste"
    Then the entry is listed as "médecin généraliste"
    And the entry has a new address
    And its former address leads to it

  Scenario: An administrator past the window is told why, and offered the way out
    Given the entry was created 40 days ago
    And I am signed in with the role "administrator"
    When I open that entry in edit mode
    Then the occupation cannot be changed any more
    When I ask why
    Then I am told it was created more than 30 days ago
    And I am offered to create a new entry with the same facility and person

  Scenario: The organization sets the administrators' window
    Given the organization lets administrators change an occupation for 5 days
    And the entry was created 10 days ago
    And I am signed in with the role "administrator"
    When I open that entry in edit mode
    Then the occupation cannot be changed any more
    When I ask why
    Then I am told it was created more than 5 days ago

  Scenario: A superuser may change the occupation of an old entry
    Given the entry was created 400 days ago
    And I am signed in with the role "superuser"
    When I open that entry in edit mode
    Then the occupation can be changed

  Scenario: An occupation the person already holds at that place is refused
    Given another entry for them as "médecin généraliste", created by that staff member
    And I am signed in with the role "staff"
    When I open that entry in edit mode
    And I change its occupation to "médecin généraliste"
    Then I am told such an entry already exists, with a link to it
