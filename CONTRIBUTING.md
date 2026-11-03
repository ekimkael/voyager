# Contributing

Everything committed is written in English: code, comments, commits, PRs, changelog, docs.

## Setup

```bash
npm ci
cp .env.example .env   # then fill DB_* and SMTP_* values
node ace generate:key
node ace migration:run
node ace db:seed        # optional, development data
npm run dev
```

## Git Flow

- `main`: releases only. Never commit or push to it directly.
- `develop`: integration branch and GitHub default branch.
- `feature/*`, `fix/*`, `refactor/*`, `docs/*`, `chore/*`: branch off `develop`, PR back into `develop`.
- `release/x.y.z`: branch off `develop`, PR into `main`, then PR into `develop`.
- `hotfix/x.y.z`: branch off `main`, PR into `main`, then PR into `develop`.
- Every PR is merged with a merge commit (no squash, no rebase) once CI is green.

Before opening a PR, run `npm run typecheck`, `npm run lint` and `npm test`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`.
Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `ci`, `chore`.
The changelog is drafted from these messages, so write them for a reader.

## Pull requests

A PR states:

- what changes and why;
- how it was verified (commands run, manual checks);
- anything not verified.

## Changelog

Feature PRs don't edit `CHANGELOG.md`. Exception: a breaking change or a migration adds a line under `[Unreleased]` by hand.
The release section is drafted from commits at release time, rewritten for humans, and reviewed in the release PR.

## JSDoc

Every export (function, hook, component, type) gets at least a one-line `/** */`.
Non-obvious internal code documents its responsibility, its invariants and why it is shaped that way.

## Release

See [docs/release.md](docs/release.md).

## Agent rules

Project conventions for code, routes, Edge.js views and UI are in [AGENTS.md](AGENTS.md).
