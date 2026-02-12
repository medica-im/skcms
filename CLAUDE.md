# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is the **frontend** of a larger application. It is paired with a backend in a separate folder and git repo.

## Backend

* **Relative path**: `../backend`
* **Git repo**: https://github.com/medica-im/clinic-cms-backend.git
* **Active branches**: `production` (live code) and `dev` (development) — the `main` branch does not reflect current code
* **Communication**: the frontend communicates with the backend exclusively through a REST API

## User interface design
* the UX is built with Skeleton v2.11 and Tailwind 3.4.19
* focus is on professionalism and sobriety