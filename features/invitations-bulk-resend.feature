@invitations-bulk-resend
Feature: Reminding pending invitations, many at once

  An invitation nobody picked up waits until someone sends it again. With
  hundreds of them, opening each one to press "Renvoyer" is not a way to
  work: the list itself has a reminder mode. It ticks every pending
  invitation that may be sent again, lets the administrator untick some on
  any page of the list, says how many emails will go, and sends them as a
  batch job on the server, which the list follows.

  No scenario here confirms a reminder: on a real site it would mail every
  ticked invitation, not only the scenario's. Starting one is covered by the
  backend tests (tests/api/test_batch_resend.py); here the job is seeded.

  Rule: what starts ticked, and what cannot be

    # Someone just reached by a batch is not mailed again by reflex: an
    # invitation emailed less than the organization's number of days ago
    # (30 unless a superuser changed it) starts unticked. One whose email is
    # still on its way would get two, so it cannot be ticked at all.

    Scenario: A pending invitation starts ticked, one just emailed does not
      Given 3 pending invitations of my own
      And the first of them was emailed 3 days ago
      And I am signed in with the role "administrator"
      When I open "/web/invite/invitees"
      And I search for my invitations
      And I start a reminder
      Then the first of them is not ticked and reads "Déjà envoyée"
      And the second of them is ticked

    Scenario: An invitation whose email is on its way cannot be ticked
      Given 2 pending invitations of my own
      And the first of them has an email on its way
      And I am signed in with the role "administrator"
      When I open "/web/invite/invitees"
      And I search for my invitations
      And I start a reminder
      Then the first of them cannot be ticked and reads "Envoi en cours"

  Rule: a choice holds across the pages of the list

    # Two thousand invitations are forty pages: unticking someone on page 3
    # must still hold when the administrator sends from page 1.

    Scenario: An invitation unticked on one page stays unticked on coming back
      Given 60 pending invitations of my own
      And I am signed in with the role "administrator"
      When I open "/web/invite/invitees"
      And I search for my invitations
      And I start a reminder
      And I untick the first invitation of the page
      And I go to the next page
      And I go back to the previous page
      Then that invitation is still unticked

  Rule: nothing goes before the administrator has read how many

    Scenario: The confirmation says how many emails will go
      Given 3 pending invitations of my own
      And I am signed in with the role "administrator"
      When I open "/web/invite/invitees"
      And I search for my invitations
      And I start a reminder
      And I untick everything
      And I tick the first and the second of them
      And I ask to send
      Then the confirmation reads "2 e-mails vont partir."
      When I cancel the confirmation
      Then no reminder was started

  Rule: the reminder runs on the server, and the list finds it again

    Scenario: A running reminder shows its progress on coming back to the list
      Given a reminder of my organization is running, 4 emails of 10 sent
      And I am signed in with the role "administrator"
      When I open "/web/invite/invitees"
      Then I see the reminder at "4 / 10 (40%)"
      And I cannot start another reminder

    Scenario: A finished reminder says what came of it until it is closed
      Given a reminder of my organization finished with 7 sent, 2 skipped and 1 failed
      And I am signed in with the role "administrator"
      When I open "/web/invite/invitees"
      Then the reminder's summary reads "envoyés : 7 · ignorés : 2 · en échec : 1"
      When I close the reminder's summary
      And I reload the page
      Then the reminder's summary is gone

  Rule: reminders have a history of their own

    # An import creates invitations, a reminder sends existing ones again:
    # one table for both had to word every column for both ("Réussies" meant
    # created on one row and sent on the next). Each kind has its own page,
    # with its own columns; a report leads back to the history it came from.

    Scenario: A reminder is listed in the reminders' history, not the imports'
      Given a reminder of my organization finished with 7 sent, 2 skipped and 1 failed
      And I am signed in with the role "administrator"
      When I open "/web/invite/reminder-logs"
      Then the reminder is listed with 7 sent
      When I open the reminder's report
      Then its way back reads "Historique des relances"
      When I open "/web/invite/batch-logs"
      Then the reminder is not listed
