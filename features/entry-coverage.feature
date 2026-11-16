@entry-creation-flow @entry-type-edit @entry-coverage
Feature: An entry without premises says where it answers

  A ligne d'écoute or a volunteer has no address to show; in its place the page says where
  it answers ("Zone couverte"): the country, a region, one or several départements, one or
  several communes, or a mix of them. Whoever may edit the entry sets it in edit mode,
  finding each place by its name or its code. A commune shows its département's code: six
  communes are called Saint-Maurice, and the name alone would not say which one.

  Background:
    Given a person and a facility created by a staff member of this site

  Scenario: The owner covers two départements and a commune, and the page shows them
    Given an entry for them as "ligne d'écoute", owned by that staff member
    And I am signed in with the role "staff"
    When I open that entry in edit mode
    And I add "Rhône (69)" to the area covered
    And I add "Ain (01)" to the area covered
    And I add "Saint-Maurice (94)" to the area covered
    And I save the area covered
    And I look at that entry without editing
    Then the area covered reads "Ain (01), Rhône (69), Saint-Maurice (94)"
