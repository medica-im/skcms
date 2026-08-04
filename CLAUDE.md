# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is the **frontend** of a larger application. It is paired with a backend in a separate folder and git repo.

## Development
It's not necessary to systematically build the sveltekit app to verify after each change because the vite dev updates automatically. Build only if necessary.

## Backend

* **Relative path**: `../backend`
* **Git repo**: https://github.com/medica-im/clinic-cms-backend.git
* **Active branches**: `production` (live code) and `dev` (development) — the `main` branch does not reflect current code
* **Communication**: the frontend communicates with the backend exclusively through a REST API

## User interface design
* the UX is built with Skeleton v2.11 and Tailwind 3.4.19
* focus is on professionalism and sobriety

## Authorization model

Three different kinds of rule govern who may do what. They live in three
different places, and confusing them is the usual source of mistakes.

**1. Role × HTTP method — the `AccessControl` table (data, not code)**

A bitmask per role per endpoint: `1` GET, `2` POST, `4` PUT/PATCH, `8` DELETE.
Changed with a `.save()` in the Django shell, no deploy. Reference values:

| endpoint | superuser | administrator | staff | registered | anonymous |
|---|---|---|---|---|---|
| `entries_v2` | 15 | 15 | 3 | 1 | 1 |
| `facilities_v2` | 15 | 7 | 3 | 1 | 1 |

Staff hold `3` (GET+POST): they may **create**, never edit or delete something
merely because they are staff. This is deliberate — the address book is a
collaborative tool, and creating an entry (facility, type and person) is
typically a staff user's first act.

**2. Who is connected to *this* object — `authorize_api(..., users)`**

`authorize_api` grants access if **either** the role check **or** the
object-level check passes. The object-level list is what lets a staff user edit
what they own without being able to touch anything else. For facilities that
list is `get_facility_users`: owners and creators of the facility itself, plus
owners and creators of the entries located at it.

A random staff member must never be able to edit a random facility. If that
becomes possible, the cause is almost always a role given `4` or `8` where it
should have `3`.

**3. Business invariants — the serializer / domain layer**

Rules that do not depend on *who* is asking ("a facility still used by an
active entry cannot be deleted") are **not permissions**. A superuser must be
refused too. They belong in `api/serializers/*.py`, raising `409 Conflict` —
never in `AccessControl`, which would force repeating them per role and let the
object-level path bypass them.

### Where to write new rules so they are picked up

* **`features/*.feature`** — the default home for a rule about observable
  behaviour. State the *why* in the `Rule:`/`Feature:` description; that
  rationale is what prevents the rule being "simplified" away later.
* **This file** — for cross-cutting invariants that belong to no single
  feature.