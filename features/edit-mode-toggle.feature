Feature: Toggling edit mode

  An entry page shows a pencil button to administrators, floating in the top
  right corner so it stays reachable while scrolling. Pressing it switches the
  page between reading and editing.

  The button says nothing on screen: the pencil carries the state, coloured and
  filled while editing, greyed and outlined while reading. The wording lives in
  the tooltip and the accessible name instead, so the control stays small
  enough not to hide the content it floats over.

  Rule: only users who may edit see the button

    Scenario: A visitor sees no edit button
      Given I am signed out
      When I open an entry page
      Then no edit mode button is shown

    Scenario: An administrator sees the edit button
      Given I am signed in with the role "administrator"
      When I open an entry page
      Then the edit mode button is shown

  Rule: the button states which mode it is in

    Background:
      Given I am signed in with the role "administrator"
      And I open an entry page

    Scenario: Reading mode is the starting point
      Then the edit mode button is off
      And its tooltip offers to enable edit mode

    Scenario: Pressing the button turns edit mode on
      When I press the edit mode button
      Then the edit mode button is on
      And its tooltip offers to leave edit mode

    Scenario: Pressing it again returns to reading
      Given I press the edit mode button
      When I press the edit mode button
      Then the edit mode button is off

  Rule: the control stays usable without sight or a mouse

    Background:
      Given I am signed in with the role "administrator"
      And I open an entry page

    # The previous control disabled whichever option was active, which removed
    # it from the tab order and left screen readers announcing "On, button"
    # without saying which mode was current.
    Scenario: The button is announced as a switch
      Then the edit mode button reports itself as a switch
      And it is never disabled

    Scenario: The button can be operated from the keyboard
      When I focus the edit mode button
      And I press Space
      Then the edit mode button is on

    # Colour alone would fail anyone who cannot distinguish it, so the two
    # states differ in shape as well.
    Scenario: The two states differ by more than colour
      Given I press the edit mode button
      Then the on and off states differ in shape

  Rule: the button floats without hiding the page

    Background:
      Given I am signed in with the role "administrator"
      And I open an entry page

    Scenario: The button stays visible while scrolling
      When I scroll down the entry page
      Then the edit mode button is still shown

    # Deliberately small: it sits over the content, so it must cover as little
    # as possible while staying comfortably clickable.
    Scenario: The button is no larger than a touch target
      Then the edit mode button is at most 48 pixels wide
