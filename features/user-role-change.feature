Feature: Changing a user's role

  An administrator can promote or demote another user from that user's detail
  page, and a superuser can suspend one. Both are privileged acts on the thing
  that decides who may do anything at all, so both are recorded and both are
  refused far more often than they are allowed.

  The rules exist to stop an account escalating itself, directly or by a chain
  of smaller steps: nobody grants a role above their own, an administrator
  cannot touch another administrator, only a superuser demotes anyone but
  themselves, the last superuser cannot step down, and a suspended account
  cannot have its role changed at all — otherwise a promotion would launder the
  suspension.

  Those refusals are not scenarios here. They belong to the endpoint, which has
  to enforce them against a request made directly, and they are checked as a
  matrix in src/tests/api/test_role_change.py — one parametrised case per rule,
  in seconds rather than a browser each. What is left here is what only a
  browser can answer: whether a person sees the control, and whether the page
  tells them what happened.

  A role is not edited in place. Changing one deactivates the current Access
  and creates a new one, so the previous role is still there afterwards with
  the time it ended and who ended it. The history section is that record read
  back — an audit trail nobody can see is one nobody can check.

  Rule: only privileged users can reach the controls

    Scenario: A staff user sees no edit switch on a user page
      Given I am signed in with the role "staff"
      When I open the detail page of another user
      Then no edit mode button is shown

    # The controls live inside edit mode rather than beside it: a page that
    # shows a role-change icon at all times invites a misclick on the one thing
    # that should never be a misclick.
    Scenario: The role control appears only in edit mode
      Given I am signed in with the role "administrator"
      And I open the detail page of another user
      Then no role change control is shown
      When I turn on edit mode
      Then a role change control is shown

    # Hiding what the caller may not grant is a courtesy — the endpoint is the
    # guard — but offering an option that will be refused is its own bug.
    Scenario: An administrator is not offered the superuser role
      Given I am signed in with the role "administrator"
      And I open the detail page of a user with the role "staff"
      When I turn on edit mode
      And I open the role change control
      Then "administrator" is offered
      And "superuser" is not offered

  Rule: the page shows what was done and by whom

    Scenario: A role change appears in the history
      Given I am signed in with the role "superuser"
      And I open the detail page of a user with the role "staff"
      When I turn on edit mode
      And I change their role to "administrator"
      Then their role is "administrator"
      And the history shows a change from "staff" to "administrator" by me
      # Where the history is fetched from decides whether it arrives at all
      # once the frontend runs in a container: a server-side fetch forwards a
      # session cookie that does not survive the trip out to the public
      # hostname, and the 401 comes back as an empty section rather than an
      # error. Indistinguishable in the DOM, so it is asserted on the request.
      And the history was fetched by the browser

  Rule: a suspended user is told why they cannot do anything

    # Not a downgrade to "registered": a suspended administrator has to stay
    # distinguishable from an ordinary user, or the dashboard has nothing to
    # explain. Signing in still works — the identity survives, the privileges
    # do not.
    Scenario: A suspended user is told on the dashboard
      Given I am signed in with the role "administrator"
      And my access has been suspended
      When I open the dashboard
      Then I am told my access is suspended

    # The dashboard warns a visitor whose email it does not recognise that they
    # may have signed up under another address. A suspended user is not that
    # person: they are known, they were granted a role, and it was taken away
    # on purpose. Telling them their email is unrecognised sends them to
    # support with the wrong question, and hides the one fact that would
    # explain their afternoon.
    #
    # The two cases look alike from the page's side because suspension
    # withholds the role — which is what strips the privileges — so "no role"
    # alone cannot tell "suspended" from "never granted anything". Only the
    # suspension flag separates them.
    Scenario: A suspended user is not told their email is unknown
      Given I am signed in with the role "administrator"
      And my access has been suspended
      When I open the dashboard
      Then I am not told my email is unknown

    # The warning still has to appear for the person it was written for,
    # or removing it for the suspended case would simply have deleted it.
    Scenario: A genuinely unknown visitor is still told
      Given I am signed in with an email nobody has been invited with
      When I open the dashboard
      Then I am told my email is unknown
