Feature: Dismissing the heatwave banner

  During a heatwave, Météo France vigilance is announced by a banner on the home
  page. A visitor who has read it can close it with the X, and it should stay
  closed for an hour — including across reloads — rather than reappearing on
  every page view.

  The banner is only shown while an alert is actually running, so dismissal is
  remembered per browser rather than per session.

  Background:
    Given a heatwave alert is in progress

  Scenario: The banner is shown during an alert
    When I open the home page
    Then the heatwave banner is visible

  Scenario: Closing the banner hides it
    Given I open the home page
    When I close the heatwave banner
    Then the heatwave banner is not visible

  Scenario: The banner stays closed after a reload
    Given I open the home page
    And I close the heatwave banner
    When I reload the page
    Then the heatwave banner is not visible

  Scenario: The banner comes back after an hour
    Given I open the home page
    And I close the heatwave banner
    When an hour has passed
    And I reload the page
    Then the heatwave banner is visible

  # In development the component shows a "Loading alert..." placeholder while
  # the Météo France request is in flight. Once dismissed there is nothing to
  # load into, so the placeholder must not flash on every reload either.
  Scenario: No loading placeholder is shown once dismissed
    Given I open the home page
    And I close the heatwave banner
    When I reload the page
    Then no heatwave loading placeholder is shown

  # Just under the hour it must still be hidden: a dismissal that expired early
  # would put the banner back in front of someone who just closed it.
  Scenario: The banner is still hidden just before the hour is up
    Given I open the home page
    And I close the heatwave banner
    When 59 minutes have passed
    And I reload the page
    Then the heatwave banner is not visible
