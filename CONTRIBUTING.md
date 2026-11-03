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

## CI

GitHub Actions runs on every PR (`.github/workflows/`):

- **CI** (`ci.yml`): the `guard` job checks the Git Flow rules (`scripts/check-git-flow.sh`: branch prefix, PRs into `main` only from `release/*` or `hotfix/*`, Conventional Commits). The `check` job runs `npm run lint`, `npm run typecheck`, `node ace migration:run`, `npm test`, `npm run build` and `npm run validate:changelog` against a PostgreSQL 16 service container, with throwaway env values set in the workflow.
- **Security** (`security.yml`): a gitleaks scan of the history and `npm audit --audit-level=high`; actionlint and zizmor check the workflows. It also runs every Monday on `develop`.
- **Release** (`release.yml`): on a push to `main`, see [docs/release.md](docs/release.md).

Dependabot opens weekly grouped updates for npm and GitHub Actions.
GitHub Free does not enforce required checks on private repos: merge only once CI is green.

To check workflow changes locally: `actionlint` (1.7.12) and `uvx "zizmor==1.32.0" --offline .github/workflows`.

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
