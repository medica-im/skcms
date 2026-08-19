Feature: The administrative entries table loads

  /web/entries lists every entry in the directory as a table, for
  administrators and superusers: who created each one, who owns it, when it
  was made and last changed, and why it was deactivated.

  This file exists because the page was built, unit-tested and component-tested
  without ever being opened in a browser. Twenty-three unit tests and eight
  component tests all passed while the page itself rendered nothing — the
  components were right and the page around them was not, and no test looked at
  the page.

  So these scenarios do the one thing the others cannot: load the real route
  against the real endpoint and check that rows appear.

  Scenario: A signed-out visitor is redirected to sign in
    Given I am signed out
    When I open "/web/entries"
    Then I am redirected to sign in for "/web/entries"

  Scenario: An administrator sees the table
    Given I am signed in with the role "administrator"
    When I open "/web/entries"
    Then the entries table is shown
    And the table lists at least one entry

  Scenario: The table shows the administrative columns
    Given I am signed in with the role "administrator"
    When I open "/web/entries"
    Then the entries table has a "Création" column
    And the entries table has a "Propriétaire" column

  Scenario: The selectors filter the table
    # The table is a different view over the addressbook's own filtering, not
    # a separate list: the search box, the commune, category and facility
    # selectors all narrow it. It was wired to the wrong derived value at
    # first — the one filtered by situation and active state but by none of
    # the selectors — so every control above the table did nothing.
    Given I am signed in with the role "administrator"
    When I open "/web/entries"
    And I search the entries for "Rochoy"
    Then the table lists fewer entries than before
    And the table lists at least one entry

  Scenario: The summary counts the entries
    Given I am signed in with the role "administrator"
    When I open "/web/entries"
    Then the summary shows a total count

  Scenario: The counts filter the table by state
    # A deactivated entry appears nowhere on the public site, so this page is
    # the only place to find one. The counts above the table are the control:
    # clicking one narrows the table to it, clicking it again goes back. No
    # separate segmented control, which would have repeated the same three
    # figures in a second row.
    Given I am signed in with the role "administrator"
    When I open "/web/entries"
    And I click the "actives" count
    Then the state filter shows it is active
    And the table lists at least one entry
