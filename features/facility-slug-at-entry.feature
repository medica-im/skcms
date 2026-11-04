@entry-creation-flow
Feature: A new facility's web address is chosen with its first entry

  A facility is created before anything is known about who works there, so its
  address cannot be good yet: with no name, all there is to build it from is a
  street. What names a place best is what is done there, and that is only known
  when the entry is confirmed, once the occupation and the person are chosen.
  The creation page therefore proposes the address on the confirmation form,
  where the person can change it, instead of when the facility is described.

  The occupation alone is what every office of that kind in a commune shares,
  and a big commune holds dozens: the proposed address always carries the
  street, so that "cabinet de kinésithérapie" in Lyon is not one address for
  all of them.

  A facility that already has an address keeps it, whatever is created there:
  links to it are shared, and facilities have no redirects.

  Background:
    Given I am signed in with the role "staff"

  Rule: a facility without an address is given one when its first entry is confirmed

    Scenario: The address is proposed from the occupation and the street
      Given a person and a facility without an address created by a staff member of this site
      When I open the creation page with that facility and that person
      And I choose an occupation and the confirmation form appears
      Then the confirmation form proposes an address made of the occupation and the street
      And the creation can be confirmed
      When I confirm the creation
      Then I am on the new entry's page
      And the facility is stored at the proposed address

  Rule: a facility that has an address keeps it

    Scenario: No address is asked for a facility that has one
      Given a person and a facility created by a staff member of this site
      When I open the creation page with that facility and that person
      And I choose an occupation and the confirmation form appears
      Then the confirmation form asks for no address
