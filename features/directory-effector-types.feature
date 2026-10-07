@entry-creation-flow
Feature: A directory may limit the categories offered when an entry is created

  Entry creation offered every category (occupation), some seventy of them,
  while a directory like unipa's only ever lists a handful. Superusers and
  administrators may now name, per directory, the categories offered — from
  the "Annuaires" page, on a phone too.

  The page shows the categories; they are edited in an overlay. Edited in
  place, among the directory's other settings, the controls read as part of
  those.

  No category named means every one is offered: that is the default, and what
  "remove all" returns to. So removing the last one lifts the limit rather
  than leaving nothing to choose from.

  The limit holds where an entry's category is chosen: creation, and changing
  the category later — otherwise an excluded category would be one step away.
  The backend refuses a category outside the list to everyone but superusers,
  who may need any category for a one-off entry: their picker is limited too,
  with a switch to show them all. The refusals, the per-directory scope and the
  set semantics are tested in backend pytest
  (tests/api/test_directory_offered_effector_types.py); this file covers what
  a person sees.

  Background:
    Given this site's directory offers every category
    And a person and a facility created by a staff member of this site

  Rule: An administrator chooses the categories, and creation offers only those

    Scenario: The categories added on the directories page are the only ones offered
      Given I am signed in with the role "administrator"
      When I open the directories page
      And I edit the directory's categories
      And I add the category "infirmière"
      And I add the category "sage-femme"
      And I close the categories overlay
      Then the directories page shows the categories "infirmière, sage-femme"
      When I start creating an entry
      And I choose that facility
      Then the category picker offers only "infirmière, sage-femme"

    Scenario: Removing them all offers every category again
      Given this site's directory offers only "infirmière, sage-femme"
      And I am signed in with the role "administrator"
      When I open the directories page
      Then the directories page shows the categories "infirmière, sage-femme"
      When I edit the directory's categories
      And I remove all the categories
      And I close the categories overlay
      Then the directories page says every category is offered
      When I start creating an entry
      And I choose that facility
      Then the category picker offers "médecin généraliste"

  Rule: A superuser's picker is limited too, but can show every category

    Scenario: A superuser shows every category with the switch
      Given this site's directory offers only "infirmière, sage-femme"
      And I am signed in with the role "superuser"
      When I start creating an entry
      And I choose that facility
      Then the category picker offers only "infirmière, sage-femme"
      When I show every category
      Then the category picker offers "médecin généraliste"

  Rule: The page works on a phone

    Scenario: Every control is within reach at phone width
      Given this site's directory offers only "infirmière, sage-femme"
      And I am signed in with the role "administrator"
      And the window is 390 by 844
      When I open the directories page
      And I edit the directory's categories
      Then the categories' controls are at least 44 pixels tall
      And the categories overlay fits the screen
      And the page does not scroll sideways
