@entry-creation-flow @entry-type-edit @entry-schedule
Feature: An entry says when it can be reached

  A service is only useful when it answers, and a mental-health line that is
  open from 8h to 20h is no help at 21h. An entry can therefore carry opening
  hours: for each day of the week, no period, one or several (a morning and an
  afternoon, say). A day with no period is closed, so a schedule starts closed
  and hours are added, never taken away from a default.

  Whether the service closes on French public holidays is part of the hours,
  and closing is the default: most services do, and promising an open line on
  Christmas Day by omission is worse than the reverse. An entry may carry
  several schedules, one per way of reaching it (by phone, on site).

  Hours are public, like the entry itself; they are set by the people answerable
  for the entry, the same ones who may edit its appointments. Staff may read
  every entry's hours but only write their own, and that refusal, the
  validation of the periods and the storage are tested in backend pytest
  (tests/api/test_schedules.py); whether a service is open now is tested in
  src/lib/Schedule. This file covers what a person sees and does.

  Background:
    Given a person and a facility created by a staff member of this site
    And an entry for them as "infirmière", created by that staff member

  Rule: Anyone sees an entry's weekly hours and whether it closes on public holidays

    Scenario: A visitor reads hours made of two periods
      Given that entry has weekday hours "08:00-12:00,14:00-18:00", closed on public holidays
      And I am signed out
      When I look at that entry
      Then its hours read "Lundi au vendredi : 08:00–12:00 et 14:00–18:00"
      And its hours do not mention "Samedi"
      And its hours say "Fermé les jours fériés."

    Scenario: A service that stays open on public holidays says so
      Given that entry has weekday hours "08:00-20:00", open on public holidays
      And I am signed out
      When I look at that entry
      Then its hours say "Ouvert les jours fériés."

    Scenario: An entry with no hours shows none
      Given I am signed out
      When I look at that entry
      Then the entry shows no hours

  Rule: The people answerable for an entry set its hours in edit mode

    Scenario: The creator adds the same hours to the weekdays
      Given I am signed in with the role "staff"
      When I open that entry in edit mode
      And I add weekday hours from "08:00" to "20:00"
      Then its hours read "Lundi au vendredi : 08:00–20:00"
      And its hours say "Fermé les jours fériés."

    Scenario: The creator says the service stays open on public holidays
      Given I am signed in with the role "staff"
      When I open that entry in edit mode
      And I add weekday hours from "08:00" to "20:00", open on public holidays
      Then its hours say "Ouvert les jours fériés."

    Scenario: The creator removes the hours
      Given that entry has weekday hours "08:00-20:00", closed on public holidays
      And I am signed in with the role "staff"
      When I open that entry in edit mode
      And I delete its hours
      Then the entry shows no hours
