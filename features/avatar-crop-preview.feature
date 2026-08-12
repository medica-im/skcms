Feature: Reviewing an avatar crop before uploading it

  Cropping is a blind operation. The cropper shows the selection over the whole
  photograph, at whatever size the dialog affords, but what actually gets stored
  is a square rendition of the selected region — and the avatar is then shown
  small and round, where a crop that looked right over the full picture turns
  out to cut the chin or leave the face off-centre.

  Uploading was the only way to find out. Correcting a bad crop therefore meant
  uploading a bad picture first, then starting the whole process again from the
  file picker, with the original photograph already discarded.

  So the crop is reviewed before it is sent: the user sees the actual result,
  as the avatar will look, and either accepts it or returns to the cropper with
  the original photograph still loaded to try a different selection.

  Rule: the crop is shown before anything is uploaded

    # The point of the step. Nothing reaches the server until the user has seen
    # what the crop produced and accepted it — so a preview that appeared only
    # after a successful upload would defeat the purpose entirely.
    Scenario: Cropping shows a preview instead of uploading straight away
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      When I validate the crop
      Then I see a preview of the cropped picture
      And no avatar has been uploaded yet

    # The preview is the crop, not the original photograph shown smaller. A
    # preview that silently displayed the source image would look plausible and
    # tell the user nothing about the selection they made.
    Scenario: The preview shows the cropped region, not the whole photograph
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      When I validate the crop
      Then the preview is square

    # Square-cornered, not round. Round is how the avatar is *displayed* around
    # the site; the preview exists to show what will be *stored*, and a circular
    # frame hides the corners of the crop being judged. Pinned because the theme
    # token this element used before rounded it into a circle on its own.
    Scenario: The preview is not drawn as a circle
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      When I validate the crop
      Then the preview has square corners

    # The cropper does not belong on screen next to its own result: two images
    # of the same photograph, one live and one frozen, is what made the previous
    # dialog ambiguous about which one would be sent.
    Scenario: The cropper gives way to the preview
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      When I validate the crop
      Then the cropper is no longer shown

  # The crop is a window onto the photograph, so it has nothing to show where it
  # leaves it: the exported picture comes back with black margins down a side,
  # or a black corner. Nothing warns of this while cropping — the selection
  # simply drifts off the image — and it is only visible once the avatar is
  # stored, which is exactly the mistake the preview step exists to catch.
  # Better to make it unreachable than to preview it.
  Rule: the crop cannot leave the photograph

    Scenario: The selection stays within the picture when dragged past its edge
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      When I drag the crop selection beyond the edge of the photograph
      Then the crop selection is still inside the photograph

    # Resizing is the other way out: a corner handle dragged outward grows the
    # selection past the edge the move handler is guarding.
    Scenario: The selection cannot be resized past the edge of the photograph
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      When I drag a corner handle well beyond the photograph
      Then the crop selection is still inside the photograph

  # A dialog whose buttons sit below the fold is a dead end: the crop cannot be
  # validated and the upload cannot be confirmed, whatever the rest of the flow
  # does. 720 tall is a laptop, not a contrived size.
  Rule: the dialog fits on the screen at every step

    Scenario: The crop button is reachable on a short window
      Given the window is 1280 by 720
      And I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      When I choose a photograph to use as the avatar
      Then the crop button is within the window

    Scenario: The upload buttons are reachable on a short window
      Given the window is 1280 by 720
      And I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      When I validate the crop
      Then the upload button is within the window
      And the preview is within the window

  Rule: a crop that does not suit can be redone on the same photograph

    # The requirement that motivated the step: going back must return to the
    # cropper with the original photograph, not to the file picker. Re-selecting
    # the file is precisely the tedium this removes, and a "back" that dropped
    # the source image would reintroduce it while appearing to work.
    Scenario: Going back returns to the cropper with the original photograph
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      And I validate the crop
      When I go back to adjust the crop
      Then the cropper is shown again
      And the preview is no longer shown
      And I did not have to choose the file again

    # A second crop must be reviewable in its turn, so the cycle can be repeated
    # until the result suits: crop, look, adjust, look again.
    Scenario: The adjusted crop can be reviewed in its turn
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      And I validate the crop
      And I go back to adjust the crop
      When I validate the crop
      Then I see a preview of the cropped picture
      And no avatar has been uploaded yet

  # Once the picture is sent there is nothing left to do but close, so every
  # other control has to say so. A dropdown that still looks editable invites a
  # change that no button can save — the user picks a new visibility, sees only
  # "Fermer", and cannot tell whether their choice was kept. It was not.
  # Each action reports what it did. The success line was fixed wording, so
  # removing a picture and changing its visibility both announced "Photo mise à
  # jour" — telling the user the opposite of what had happened in the first case.
  Rule: the confirmation says which action succeeded

    Scenario: Deleting a picture says the picture was deleted
      Given I am signed in as an administrator, on an entry of this site
      And that entry already has a picture
      And I open the avatar dialog for that entry
      When I delete the picture
      Then the dialog confirms the picture was deleted
      And the dialog does not claim the picture was updated

  Rule: nothing looks editable once the upload has succeeded

    Scenario: The access selector is inert after a successful upload
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      And I validate the crop
      When I confirm the upload
      Then the avatar is uploaded successfully
      And the access selector is disabled

    # While the crop is still under review the choice is live: it is sent with
    # the picture, so it must stay editable right up to the moment it is used.
    # Red is for a warning, and there is nothing to warn about once the picture
    # is safely stored. The same button warns while it still means "cancel",
    # because that one abandons work.
    Scenario: The closing button stops warning once the upload succeeded
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      And I validate the crop
      When I confirm the upload
      Then the avatar is uploaded successfully
      And the closing button is not styled as a warning

    Scenario: The access selector is live while reviewing the crop
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      When I validate the crop
      Then the access selector is enabled

  Rule: the upload sends the crop that was reviewed

    # The preview would be worthless if the confirmed upload were recomputed
    # from a selection the user never saw. Confirming sends the reviewed crop
    # and closes the operation.
    Scenario: Confirming uploads the previewed crop
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      And I validate the crop
      And I see a preview of the cropped picture
      When I confirm the upload
      Then the avatar is uploaded successfully
      And the entry has an avatar

    # Abandoning at the review step must leave the entry as it was: having seen
    # the crop and disliked it is a reason to stop, not a commitment to send it.
    Scenario: Closing the dialog at the preview step uploads nothing
      Given I am signed in as an administrator, on an entry of this site
      And I open the avatar dialog for that entry
      And I choose a photograph to use as the avatar
      And I validate the crop
      When I close the avatar dialog
      Then no avatar has been uploaded yet
