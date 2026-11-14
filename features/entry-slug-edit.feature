@entry-creation-flow @entry-type-edit @entry-slug-edit
Feature: Changing an entry's address

  An entry's address (/e/<name>) is built from its name, its occupation and its
  place, and sometimes reads badly. Whoever the entry belongs to can correct it
  from the entry page, in edit mode:

  * the entry's owner;
  * an administrator or a superuser.

  Someone who only created the entry may not: a creator may have handed it over,
  and an address is shared widely. The old address is kept and leads to the entry,
  so no link already shared is broken; an address another entry holds, or used to
  hold, is never given away, since its links would reach the wrong entry.

  Background:
    Given a person and a facility created by a staff member of this site

  Scenario: The owner corrects the address and the old one keeps working
    Given an entry for them as "infirmière", owned by that staff member
    And I am signed in with the role "staff"
    When I open that entry in edit mode
    Then the page shows the entry's own address
    When I change its address
    Then the entry has a new address
    And its former address leads to it

  Scenario: Someone who only created the entry may not change its address
    Given an entry for them as "infirmière", created by that staff member
    And I am signed in with the role "staff"
    When I open that entry in edit mode
    Then the address cannot be changed

  Scenario: An administrator may change any address
    Given an entry for them as "infirmière", created by that staff member
    And I am signed in with the role "administrator"
    When I open that entry in edit mode
    Then the address can be changed

  Scenario: An address another entry holds is refused, and free ones are offered
    Given an entry for them as "infirmière", owned by that staff member
    And another entry for them as "médecin généraliste", whose address I note
    And I am signed in with the role "staff"
    When I open that entry in edit mode
    And I try the address of the other entry
    Then I am told the address is already used by another entry
    And I am offered free addresses for this entry
    And the address cannot be saved
