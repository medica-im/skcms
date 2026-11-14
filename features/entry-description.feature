@entry-creation-flow @entry-type-edit @entry-description
Feature: An entry says what it offers

  A professional choosing where to send a patient needs to know, in a few lines,
  what a service offers, for whom and on what terms (free, anonymous, without an
  appointment, who does the listening). The entry carries that summary, written
  and corrected from its page in edit mode by the people answerable for it: its
  creator or owner, administrators, superusers. The text lives on the entry
  itself, in the site's one language; emptying it removes it, and a page with no
  description shows no empty section.

  Background:
    Given a person and a facility created by a staff member of this site
    And an entry for them as "infirmière", created by that staff member

  Scenario: The creator writes the description, and the page shows it
    Given I am signed in with the role "staff"
    When I open that entry in edit mode
    And I write the description "Permanence sans rendez-vous, gratuite et anonyme."
    Then the page shows the description "Permanence sans rendez-vous, gratuite et anonyme."

  Scenario: Emptying the description removes it
    Given I am signed in with the role "staff"
    When I open that entry in edit mode
    And I write the description "Permanence sans rendez-vous."
    And I write the description ""
    Then the page shows no description
