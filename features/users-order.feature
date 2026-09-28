Feature: Users are listed by creation date, newest first, and the order can be reversed

  Like the invitations list: the users page showed the API's order, which is
  none. It opens newest first, the "Création" header reverses it on a large
  screen, and a control above the list does on a phone.

  The order is read from each row's machine-readable date (<time datetime>),
  so these scenarios hold whatever users the site has.

  Scenario: The header reverses the order
    Given I am signed in with the role "administrator"
    When I open "/web/users"
    Then the users are listed newest first
    When I sort the users by creation date
    Then the users are listed oldest first

  Scenario: On a phone, the order is chosen above the list
    Given I am signed in with the role "administrator"
    And I browse on a phone
    When I open "/web/users"
    Then the users are listed newest first
    When I choose to see the oldest users first
    Then the users are listed oldest first
