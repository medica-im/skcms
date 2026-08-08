#!/usr/bin/env bash
#
# Print the immutable tag for a build: the short sha of this repository and of
# the skvar submodule, plus "-dirty" when either had uncommitted changes.
#
#   4370998-a1b2c3d
#   4370998-a1b2c3d-dirty
#
# Why a tag and not only the labels the Dockerfile already sets: a label says
# what an image is, but only a tag can ask a registry for it. Everything was
# pushed as :latest alone, so each push moved that single pointer and the
# displaced image became unaddressable — a bad deploy had nothing to go back to,
# even when the commit it came from was known.
#
# Both repositories, because an image depends on both: two sites built from the
# same skcms commit against different skvar branches are different images and
# must not collide on one tag.
#
# The three inputs can be overridden, which is how src/lib/image-tag.test.ts
# checks the formatting without fabricating a repository:
#   IMAGE_TAG_GIT_SHA, IMAGE_TAG_SUBMODULE_SHA, IMAGE_TAG_DIRTY (0|1)
set -euo pipefail

SUBMODULE_PATH="${IMAGE_TAG_SUBMODULE_PATH:-src/routes/(skvar)}"

if [[ -n "${IMAGE_TAG_GIT_SHA:-}" ]]; then
    GIT_SHA="$IMAGE_TAG_GIT_SHA"
else
    GIT_SHA="$(git rev-parse HEAD)"
fi

if [[ -n "${IMAGE_TAG_SUBMODULE_SHA:-}" ]]; then
    SUBMODULE_SHA="$IMAGE_TAG_SUBMODULE_SHA"
else
    SUBMODULE_SHA="$(git -C "$SUBMODULE_PATH" rev-parse HEAD)"
fi

if [[ -n "${IMAGE_TAG_DIRTY:-}" ]]; then
    DIRTY="$IMAGE_TAG_DIRTY"
else
    # Edited files in either repository, since the submodule is compiled into
    # the image just as much as this one is.
    #
    # --ignore-submodules=all, and that is the point: a build checks out the
    # site's skvar branch, so the submodule pointer always differs from the
    # commit this repository records and `git status` always reports " M
    # src/routes/(skvar)". Counting that put -dirty on every image ever built,
    # which says nothing and trains you to ignore the warning. The submodule's
    # own commit is already in the tag, so where it points is described, not
    # unknown. What -dirty has to mean is that something was edited and is in
    # neither commit — checked inside the submodule on the line below.
    DIRTY=0
    [[ -n "$(git status --porcelain --ignore-submodules=all 2>/dev/null)" ]] && DIRTY=1
    [[ -n "$(git -C "$SUBMODULE_PATH" status --porcelain 2>/dev/null)" ]] && DIRTY=1
fi

TAG="${GIT_SHA:0:7}-${SUBMODULE_SHA:0:7}"
[[ "$DIRTY" == "1" ]] && TAG="${TAG}-dirty"

printf '%s\n' "$TAG"
