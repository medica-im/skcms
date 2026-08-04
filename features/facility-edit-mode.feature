Feature: Edit mode on the facility page

  The facility page is read first and edited rarely, so its editing controls
  stay out of the way until they are asked for. A pencil in the corner turns
  edit mode on, exactly as on the entry page — the same switch, the same
  behaviour — and only then do the buttons that change the facility appear.

  Those buttons float over the page rather than sitting in it: they are
  semi-transparent and take no space of their own, so turning edit mode on
  never moves the photograph, the map or the address a single pixel. Someone
  reading the page sees the same layout whether they can edit it or not.

  Rule: the pencil is offered to whoever may edit the facility

    Scenario: The pencil is shown to someone answerable for the facility
      Given I am signed in as the owner of an entry at a facility of this site
      When I open the facility page for that facility
      Then I see the edit mode pencil

    Scenario: A signed-out visitor is offered no pencil
      Given I am signed out
      And I open the facility page for a facility of this site
      Then I do not see the edit mode pencil

  Rule: the editing buttons appear only in edit mode

    Scenario: The buttons are hidden until the pencil is pressed
      Given I am signed in as the owner of an entry at a facility of this site
      And I open the facility page for that facility
      Then I do not see the edit facility button
      And I do not see the "add picture" button

    Scenario: Turning edit mode on reveals both buttons
      Given I am signed in as the owner of an entry at a facility of this site
      And I open the facility page for that facility
      When I turn edit mode on
      Then I see the edit facility button
      And I see the "add picture" button

    Scenario: Turning edit mode off hides them again
      Given I am signed in as the owner of an entry at a facility of this site
      And I open the facility page for that facility
      And I turn edit mode on
      When I turn edit mode off
      Then I do not see the edit facility button
      And I do not see the "add picture" button

  Rule: edit mode never moves the page underneath

    # The whole point of floating the controls: an editor and a reader see the
    # facility laid out identically, and pressing the pencil does not make the
    # content jump.
    Scenario: The photograph and the map stay exactly where they were
      Given the facility of this site has a place picture
      And I am signed in as the owner of an entry at that facility
      And I open the facility page for that facility
      When I turn edit mode on
      Then the photograph has not moved
      And the map has not moved

  Rule: the pencil stays clickable while edit mode is on

    # If the buttons overlap the pencil, pressing it again lands on "edit
    # facility" instead and edit mode can never be turned off.
    Scenario: The buttons do not cover the pencil
      Given I am signed in as the owner of an entry at a facility of this site
      And I open the facility page for that facility
      When I turn edit mode on
      Then the editing buttons do not overlap the edit mode pencil
      And the edit mode pencil is what receives a click on itself

  Rule: the buttons let the page show through

    # Semi-transparent so that what they cover is still legible: they sit on
    # top of the page rather than replacing part of it.
    Scenario: Both buttons are semi-transparent
      Given I am signed in as the owner of an entry at a facility of this site
      And I open the facility page for that facility
      When I turn edit mode on
      Then the edit facility button is semi-transparent
      And the "add picture" button is semi-transparent
