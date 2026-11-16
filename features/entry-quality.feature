@entry-creation-flow @entry-type-edit @entry-quality
Feature: An entry says what it is missing

  An entry is made in steps, and an incomplete one is worth more than none; but a ligne
  d'écoute with no phone number is a line nobody can call, and a page with no description
  says nothing of what the service offers. Nothing blocks an edit: the directory checks its
  entries against rules by type and by what they offer (backend directory/quality.py) and
  says what is missing:

  * to whoever may fix an entry, at the top of its page in edit mode, the entry's owner or
    creator, administrators and superusers; what is missing comes first;
  * to administrators and superusers, for the whole directory, on one page, rule by rule,
    each with the entries to fix.

  Background:
    Given a person and a facility created by a staff member of this site

  Scenario: The owner sees what the entry is missing, and each fix removes its line
    Given an entry for them as "ligne d'écoute", owned by that staff member
    And I am signed in with the role "staff"
    When I open that entry in edit mode
    Then the quality box says "Ligne d'écoute sans numéro de téléphone"
    And the quality box says "Pas de présentation"
    When I write the description "Écoute gratuite et anonyme, sans rendez-vous."
    Then the quality box no longer says "Pas de présentation"
    And the quality box says "Ligne d'écoute sans numéro de téléphone"

  Scenario: Outside edit mode the page says nothing of what is missing
    Given an entry for them as "ligne d'écoute", owned by that staff member
    And I am signed in with the role "staff"
    When I look at that entry without editing
    Then there is no quality box

  Scenario: An administrator reads the directory's problems, rule by rule
    Given an entry for them as "ligne d'écoute", created by that staff member
    And I am signed in with the role "administrator"
    When I open the quality report
    Then the report lists that entry under "Ligne d'écoute sans numéro de téléphone"
