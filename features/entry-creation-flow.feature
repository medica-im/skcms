@entry-creation-flow
Feature: Creating an entry, step by step

  An entry is (person, occupation, place), and the creation page builds it in
  that order of questions: a place (établissement), then an occupation
  (catégorie), then a person, then -- for administrators and superusers -- the
  organizations the entry is affiliated to, and a confirmation form.

  Each step appears once the previous one is answered, and an answered step
  shows "1 … sélectionné(e)" with a ✖ that undoes it. These scenarios pin that
  behaviour as it is today, for the three roles that create entries, before
  the page learns to open with a place and a person already chosen: whatever
  changes must still pass them.

  Each scenario uses a person and a facility created for it by a staff member
  of the site, and an occupation that exists. That is what every role's lists
  offer: a person is listed to its creator, to administrators as a
  colleague's, to a superuser among everyone; a facility is listed to staff
  and administrators only when it belongs to the organization, which a
  facility created on the site does. Being new, the person has no entry
  anywhere, so the one created here is new too, and removing it afterwards
  touches nothing else.

  Background:
    Given a person and a facility created by a staff member of this site

  Scenario: A staff member creates an entry without the affiliations step
    Given I am signed in with the role "staff"
    When I start creating an entry
    And I choose that facility
    And I choose an occupation
    And I choose that person among the existing ones
    Then the affiliations step is not offered
    When I confirm the creation
    Then I am on the new entry's page
    And the entry is recorded with the "staff" test user as its creator

  Scenario Outline: A <role> creates an entry, going past the affiliations step
    Given I am signed in with the role "<role>"
    When I start creating an entry
    And I choose that facility
    And I choose an occupation
    And I choose that person among the existing ones
    Then the affiliations step is offered
    When I go past the affiliations step
    And I confirm the creation
    Then I am on the new entry's page
    And the entry is recorded with the "<role>" test user as its creator

    Examples:
      | role          |
      | administrator |
      | superuser     |

  # What prefilling the page will rely on: an answered step is state, and its
  # ✖ gives the question back.
  Scenario: Each answered step can be undone
    Given I am signed in with the role "administrator"
    When I start creating an entry
    And I choose that facility
    And I choose an occupation
    And I undo the occupation
    Then the occupation question is asked again
    When I undo the facility
    Then the facility question is asked again

  # How an entry whose occupation can no longer be changed is replaced: the
  # page opens with its place and person, and only the occupation is asked.
  Scenario: The page can open with a facility and a person already chosen
    Given I am signed in with the role "administrator"
    When I open the creation page with that facility and that person
    Then the facility is shown as chosen and the occupation question is asked
    When I choose an occupation
    Then the person is shown as chosen, without being asked for
    When I go past the affiliations step
    And I confirm the creation
    Then I am on the new entry's page
    And the entry is recorded with the "administrator" test user as its creator

  Scenario: Unknown facility and person in the address are ignored
    Given I am signed in with the role "administrator"
    When I open the creation page with a facility and a person that do not exist
    Then the facility question is asked again
