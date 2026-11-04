@entry-creation-flow @entry-type-edit
Feature: The button that edits a person sits beside the person's name

  On an entry page in edit mode, the pen that opens the person's dialog belongs
  to the name: it follows it on the same line, on a phone as on a desktop,
  instead of standing alone on the line below as if it edited something else.

  Its tooltip says what it edits. The page also has pens for the facility, the
  occupation, the phones and the emails, so "Modifier" alone does not tell them
  apart.

  Background:
    Given a person and a facility created by a staff member of this site
    And an entry for them as "infirmière", created by that staff member
    And I am signed in with the role "staff"

  Scenario Outline: The button follows the name
    Given the window is <width> pixels wide
    When I open that entry in edit mode
    Then the button that edits the person is on the line of the person's name
    And that button is titled "Modifier la personne"

    Examples:
      | width |
      | 1280  |
      | 390   |
      | 280   |
