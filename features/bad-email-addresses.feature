Feature: Bad email addresses are shown where administrators work, and fixed there

  An invitation to a mailbox that does not exist bounces. Retrying it is
  useless and hurts the sending domain, so the backend remembers the address
  and no longer sends to it on its own. The people who can fix it are the
  organization's administrators: they know the member and can ask for the
  right address. So the invitation pages say it plainly, where they already
  work -- no separate page:

  - the list flags the address (never colour alone), shows a banner with how
    many addresses need checking, and offers an "À vérifier" filter;
  - the invitation's page says what happened and what to do, and lets the
    address be corrected in place (the invitation then goes to the new
    address: tested in backend pytest and the component test, since it
    really sends);
  - resending to an address that bounced asks first;
  - the batch report counts and flags its addresses to check.

  Scenario: A bounce flags the address in the list, live
    Given I am signed in with the role "administrator"
    And an invitation whose email was just sent
    When I open the invitations list
    And the mail service reports that the email bounced
    Then that invitation's address is flagged "Adresse rejetée"
    And a banner says "1 adresse à vérifier"
    When I show only the addresses to check
    Then that invitation is listed under "À vérifier"

  # Its row changed live: it must still open its edit form. The pushed
  # delivery was a $state proxy, which pushState could not copy -- the form
  # silently never opened (lib/Invitee/liveDeliveries.svelte.ts).
  Scenario: An invitation flagged live can still be edited from the list
    Given I am signed in with the role "administrator"
    And an invitation whose email was just sent
    When I open the invitations list
    And the mail service reports that the email bounced
    Then that invitation's address is flagged "Adresse rejetée"
    When I edit that invitation from the list
    Then its edit form opens

  Scenario: Resending to an address that bounced asks first
    Given I am signed in with the role "administrator"
    And an invitation whose address bounced before
    When I open that invitation's page
    Then I read "La boîte de réception n’existe pas"
    When I send the invitation again
    Then I am asked "Renvoyer quand même ?" and nothing is sent

  Scenario: The batch report counts and flags its addresses to check
    Given I am signed in with the role "administrator"
    And a batch whose invitation's email bounced
    When I open that batch's report
    Then the report counts 1 address to check
    And that invitation's address is flagged in the report

  # Before sending: the form never submits here, so nothing is sent.
  Scenario: The invitation form suggests the likely address
    Given I am signed in with the role "administrator"
    When I open "/web/invite/create"
    And I type the invitation address "e2e-typo@gmial.com"
    Then I am asked whether I meant "e2e-typo@gmail.com"
    When I accept the suggestion
    Then the address reads "e2e-typo@gmail.com"
