Feature: Home page

  Example BDD spec to verify the playwright-bdd wiring works end-to-end.

  Scenario: The home page loads
    Given I am on the home page
    Then the page has a non-empty title
