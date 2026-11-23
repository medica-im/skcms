@entry-creation-flow @entry-type-edit @entry-schedule
Feature: A place shows when its secretariat can be reached

  What a visitor wants to know is when "la maison de santé" is open and when
  they can call. The organization that runs the programs, the company that pays
  the reception desk and the members who practise at other sites are internal
  matters: the visitor should not have to understand them to find an opening
  hour.

  The hours are therefore kept once, on the secretariat entry located at the
  place, and shown where a visitor looks for a place: its facility page. Other
  pages point there instead of repeating the hours, so that a change is made in
  one spot and two pages never disagree. The organization's own entry carries
  no such hours: it describes the organization, whose members practise at
  several places.

  Background:
    Given a person and a facility created by a staff member of this site

  Rule: The facility page shows the hours of the secretariat located there

    Scenario: A visitor finds the secretariat's hours on the facility page
      Given an entry for them as "secrétariat", created by that staff member
      And that entry has weekday hours "08:30-11:00,14:00-17:00", closed on public holidays
      And I am signed out
      When I look at that entry's facility
      Then the facility shows a secretariat
      And its hours show "Lundi" as "8:30–11:00 et 14:00–17:00"
      And its hours show "Samedi" as "Fermé"

    Scenario: A facility without a secretariat shows none
      Given an entry for them as "infirmière", created by that staff member
      And I am signed out
      When I look at that entry's facility
      Then the facility shows no secretariat
