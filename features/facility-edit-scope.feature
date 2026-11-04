Feature: Editing a facility corrects its record, it does not create another place

  The edit dialog is for correcting a facility: giving it a name, fixing the
  spelling of its street, putting its GPS marker where it really is, or
  replacing an address that was badly recorded, postal code included: a
  facility entered under the wrong arrondissement has to be correctable. The
  commune is shown, not offered for editing.

  What the dialog is not for is replacing one place by another: a facility that
  really moved is a different établissement, to be created as such. The
  geocoder cannot tell the two apart, so it says so as soon as someone uses it,
  and tells anyone whose entry (a person, a company, an association) has
  changed établissement to contact an administrator.

  The postal code is not typed: it comes with the address chosen in the
  geocoder, so that the two cannot disagree.

  Send and cancel finish the form, so on a desktop screen they are in sight as
  soon as the dialog opens: a dialog that hides them below the fold leaves
  people unsure whether anything can be sent. What makes room for them is the
  map's zoom, latitude and longitude, three short values that share one line
  above the map instead of one line each. On a phone the form is longer than the
  screen whatever is done, and the buttons are reached by scrolling (see
  facility-modal-mobile.feature); there the three values wrap.

  Background:
    Given I am signed in with the role "administrator"
    And I open a facility page
    And I open the facility edit dialog

  Rule: the postal code follows the address chosen in the geocoder

    Scenario: The postal code is not typed
      Then the postal code is shown and cannot be edited

    Scenario: The geocoder offers an address of another postal code in the commune
      When I search an address of another postal code of the same commune in the geocoder
      Then that address is offered

    Scenario: Choosing it changes the postal code
      When I search an address of another postal code of the same commune in the geocoder
      And I choose the address offered
      Then the postal code is that of the address chosen

    Scenario: The commune cannot be edited
      Then the commune cannot be edited

  Rule: using the geocoder says it corrects an error, it does not create another établissement

    Scenario: No warning before the geocoder is used
      Then the geocoder warning is not shown

    Scenario: The warning appears when the geocoder is clicked
      When I click in the geocoder
      Then the geocoder warning says it corrects an error, does not create a new établissement, and sends a moved entry to an administrator

  Rule: on a desktop screen send and cancel are in sight as soon as the dialog opens

    Scenario: The map's values share a line above the map
      Given the screen is a desktop
      Then zoom, latitude and longitude are on the same line

    Scenario: The postal code and the commune share a line
      Given the screen is a desktop
      Then the postal code and the commune are on the same line

    Scenario: Send and cancel need no scrolling
      Given the screen is a desktop
      Then the submit button is entirely visible
      And the cancel button is entirely visible
