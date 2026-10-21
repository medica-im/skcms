@invitation-settings
Feature: How long a pending invitation waits before a reminder

  A reminder ticks the pending invitations emailed at least this many days
  ago, so someone just reached by a batch is not mailed again by reflex. How
  long that is depends on the organization -- a week for some, a month for
  others -- so it is a setting of the organization, 30 days unless changed.
  Administrators send the reminders and read it; changing it is a
  superuser's decision.

  Scenario: A superuser changes how long a pending invitation waits
    Given I am signed in with the role "superuser"
    When I open "/web/invite/settings"
    And I set the days before a reminder to 45 and save
    Then the settings are saved
    And the reminder mode of the invitations list says "moins de 45 jours"

  Scenario: An administrator may not change it
    Given I am signed in with the role "administrator"
    When I open "/web/invite/settings"
    Then the response status is 403
    And I see a message explaining the page is reserved for administrators
