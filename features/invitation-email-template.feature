@invitation-email
Feature: Wording the invitation email

  An organization words the email its invitees receive, instead of every
  organization sending the same text. The page (/web/invite/email-template)
  edits it, previews it, and holds the images it links.

  Administrators and higher may always see it: they send the invitations and
  should know what they say. Who may change it is the organization's choice,
  stored on its record — its administrators, or its superusers only, which is
  the default. Nobody below administrator sees the page at all.

  Rule: the page is reserved for administrators and higher

    Scenario: A signed-out visitor is sent to sign in
      Given I am signed out
      When I open the invitation email page
      Then I am sent to sign in before the invitation email page

    Scenario: A team member is told the page is not for them
      Given I am signed in with the role "staff"
      When I open "/web/invite/email-template"
      Then the response status is 403
      And I see a message explaining the page is reserved for administrators

  Rule: who may change the emails is the organization's choice

    # An email goes out under the organization's name: wording it is a
    # decision an organization opts into delegating, not one it discovers
    # was delegated. So administrators only read, until it says otherwise.
    Scenario: By default an administrator may read and preview but not change
      Given I am signed in with the role "administrator"
      And my organization uses the default invitation email
      When I open the invitation email page
      Then I am told only super administrators may change the emails
      And there is no way to save the template
      And the subject cannot be edited
      When I open the preview
      Then the text version of the preview reads "Bonjour Camille Exemple"
      When I open the images
      Then there is no way to add an image

    Scenario: An administrator may change the emails when the organization lets them
      Given I am signed in with the role "administrator"
      And my organization uses the default invitation email
      And my organization lets its administrators change its emails
      When I open the invitation email page
      And I change the subject to "Rejoignez {{ organization_short_name }}"
      And I save the template
      Then the template in effect is the organization's own

  Rule: saving creates the organization's own template, never touching the shared default

    # The default is shared by every organization without its own. An
    # administrator editing "the" template must not change what the others send.
    Background:
      Given I am signed in with the role "superuser"
      And my organization uses the default invitation email

    Scenario: The page says which template is in effect
      When I open the invitation email page
      Then the template in effect is the default one

    Scenario: A saved template becomes the organization's own
      When I open the invitation email page
      And I change the subject to "Rejoignez-nous sur {{ site_name }}"
      And I save the template
      Then the template in effect is the organization's own
      And after reloading the page the subject is still "Rejoignez-nous sur {{ site_name }}"

    # "Nom court de votre organisation" says what a field is; only its value
    # on this site says what the email will actually print.
    Scenario: Each field shows what it prints on this site
      When I open the invitation email page
      Then the field "signin_url" shows this site's sign-in page
      And the field "organization_short_name" shows a value
      And the field "invitee_name" shows the example "Camille Exemple"
      And a screen reader hears the value of "signin_url" announced as this site's

    Scenario: Nothing can be saved before something changes
      When I open the invitation email page
      Then the save button is disabled

    # An invitation that does not say where to sign in invites nobody. The
    # refusal names the field it is about, and nothing is saved.
    Scenario: A template without the sign-in link is refused
      When I open the invitation email page
      And I replace the content with "<p>Bonjour {{ invitee_name }}</p>"
      And I save the template
      Then I am told under the content that the sign-in link is missing
      And the template in effect is the default one

  Rule: the preview shows the draft as a made-up invitee would receive it

    Background:
      Given I am signed in with the role "superuser"
      And my organization uses the default invitation email

    Scenario: The preview addresses a made-up invitee
      When I open the invitation email page
      And I replace the content with "<p>Bonjour {{ invitee_name }}</p><a href=\"{{ signin_url }}\">Entrer</a>"
      And I choose the HTML format
      And I open the preview
      Then the preview reads "Bonjour Camille Exemple"
      And the email is framed as a panel, with the corners of a panel and not of a button

    # The html is pasted by an administrator. In the preview it runs in an
    # empty sandbox: no script executes, whatever the template contains.
    Scenario: A script in the template does not run in the preview
      When I open the invitation email page
      And I replace the content with "<p id=\"probe\">inerte</p><script>document.getElementById('probe').textContent='exécuté'</script>{{ signin_url }}"
      And I choose the HTML format
      And I open the preview
      Then the preview reads "inerte"

  Rule: images are hosted on the site, and their address is what goes in a template

    Background:
      Given I am signed in with the role "superuser"
      And my organization has no email images

    # The address is absolute: an email is read far from the site.
    Scenario: An uploaded image can be linked from anywhere
      When I open the invitation email page
      And I open the images
      And I upload the image "logo-e2e.png"
      Then the gallery shows "logo-e2e"
      And its address is absolute and serves the image

    # Leaving the tab unmounts every tile. That once threw in the image
    # viewer's teardown and froze every tab of the page.
    Scenario: The tabs keep working after leaving the images
      When I open the invitation email page
      And I open the images
      And I upload the image "logo-e2e.png"
      And I open the template
      And I open the images
      Then the gallery shows "logo-e2e"

    # The bytes are checked, not the name: a file that only claims to be an
    # image is refused, and the page says why instead of waiting forever.
    Scenario: A file that is not an image is refused with a reason
      When I open the invitation email page
      And I open the images
      And I upload a text file named "faux.png"
      Then I am told the file is not a valid image
      And the gallery is empty

    # Deleting breaks emails already sent, so it asks first; once confirmed,
    # the file is gone, not merely unlisted.
    Scenario: A deleted image is gone from the gallery and from the site
      When I open the invitation email page
      And I open the images
      And I upload the image "logo-e2e.png"
      And I delete the image "logo-e2e"
      Then the gallery is empty
      And its address no longer serves the image
