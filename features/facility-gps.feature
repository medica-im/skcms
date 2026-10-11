Feature: A facility's GPS position

  A facility's position is what puts it, and every entry located at it, on the
  directory maps. The forms used to save 0/0 whenever nobody used the geocoder,
  which drew those entries in the Gulf of Guinea and stretched every map to
  include them. A facility without a known position is now stored with none,
  and is simply left off the maps.

  The geocoder is the reliable way to get a position: it fills in the address
  and the coordinates together. So the forms point to it before accepting a
  facility without one, and say how the map works when it has to be used by hand.

  Background:
    Given I am signed in with the role "administrator"

  Rule: saving a facility without a position is a choice the user makes knowingly

    # The user may not know there is a position at all: the coordinates sit
    # below the fold, beside a map. Saving silently would hide the facility from
    # every map with no one noticing.
    Scenario: Saving without a position asks first
      Given a facility of this site has no GPS position
      And I open the edit dialog of that facility
      When I change its building to "Bâtiment GPS"
      And I submit the facility edit dialog
      Then I am told the facility will not appear on the map

    Scenario: Choosing the geocoder points to it
      Given a facility of this site has no GPS position
      And I open the edit dialog of that facility
      When I change its building to "Bâtiment GPS"
      And I submit the facility edit dialog
      And I choose to use the geocoder
      Then the geocoder is highlighted and has the focus
      And the facility still has no saved building

    Scenario: Confirming saves the facility with no position, not 0/0
      Given a facility of this site has no GPS position
      And I open the edit dialog of that facility
      When I change its building to "Bâtiment GPS"
      And I submit the facility edit dialog
      And I choose to save without a position
      Then the facility edit is saved
      And the facility is stored with no position

  Rule: a facility without a position has no map, and its editors are told

    Scenario: The facility page shows no map and flags the missing position
      Given a facility of this site has no GPS position
      When I open the page of that facility in edit mode
      Then the page flags the missing GPS position
      And the page shows no map of the facility

  Rule: the map in the edit dialog says what a click does

    # Placing a facility by hand is the fallback when the geocoder does not know
    # the address. Nothing on a bare map says that clicking it records a position.
    Scenario: The hint follows the marker
      Given a facility of this site has no GPS position
      And I open the edit dialog of that facility
      Then the map in the dialog says "Cliquez sur la carte pour placer l'établissement"
      When I click the map in the dialog
      Then the map in the dialog says "Cliquez pour déplacer le repère"
      And the latitude and longitude fields are filled

  Rule: editing a facility keeps what the user did not touch

    # The dialog used to start every facility at zoom 18 with an empty
    # geographical complement, and the facility page handed it no BAN ids, so
    # any edit erased all three. The BAN ids are the facility's link to its
    # official address, and nothing in our data can restore them once lost.
    Scenario: The zoom, the geographical complement and the BAN ids survive an edit
      Given a facility of this site has zoom 16, the complement "2e étage" and BAN ids
      And I open the edit dialog of that facility
      When I change its building to "Bâtiment GPS"
      And I submit the facility edit dialog
      Then the facility edit is saved
      And the facility is stored with zoom 16 and the complement "2e étage"
      And the facility keeps its BAN ids
