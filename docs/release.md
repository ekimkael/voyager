# Release

Git Flow release. Agents run it with the `/release` skill; this page is the reference.

## Naming

| Item     | Format                                       |
| -------- | -------------------------------------------- |
| Branch   | `release/1.4.0` (`hotfix/1.4.1` from `main`) |
| Commit   | `chore(release): 1.4.0`                      |
| Tag      | annotated `v1.4.0`                           |
| PR title | `Release 1.4.0`                              |

## Steps

1. From an up-to-date `develop` (or `main` for a hotfix), create `release/x.y.z`.
2. Bump the version: `npm version x.y.z --no-git-tag-version`.
3. Draft the changelog section from the commits since the last tag:
   `git cliff --unreleased --tag vx.y.z --strip header` (or `git log <last-tag>..HEAD` without git-cliff).
   Rewrite it for humans: group related commits, drop `chore`/`ci`/`test`, describe the impact.
   Manual lines already under `[Unreleased]` come first. Insert it as `## [x.y.z] - YYYY-MM-DD` under an empty `## [Unreleased]`.
4. `node scripts/validate-changelog.mjs x.y.z`.
5. Commit `chore(release): x.y.z`, push, and open two PRs: into `main`, then into `develop`.
6. Once CI is green on the `main` PR: `npm audit --audit-level=high`, a gitleaks scan, and a security review of risky areas.
   No merge with an open high or critical finding.
7. Merge the `main` PR (merge commit).
8. Tag the merge commit on `main`:
   Voyager has no automatic deployment: tag right after the merge.
9. Push the tag and publish the GitHub Release with the changelog section as notes.
10. Merge the `develop` PR, delete `release/x.y.z`, fast-forward local `main` and `develop`.

Never move or delete a published tag. A bad release is fixed by a new `hotfix/x.y.z`.

## Project specifics

- **Target:** shared hosting running Phusion Passenger (no background workers, no WebSockets; see
  [the epic 4 design spec](superpowers/specs/2026-03-20-epic4-reservations-billetterie-design.md)). <!-- TODO: host name and URL -->
- **Deployment:** manual, no workflow in this repo. <!-- TODO: exact steps (upload, `npm ci --omit=dev`, `node ace migration:run --force`, Passenger restart) -->
- **Build:** `npm run build` writes the production app to `build/`; run `node bin/server.js` from inside `build/`.
- **Smoke test:** <!-- TODO: URL to load and pages to check after a deployment -->
- **Rollback:** <!-- TODO: how to redeploy the previous tag and whether migrations must be rolled back -->
