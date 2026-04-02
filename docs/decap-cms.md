# Decap CMS workflow

This repository uses Decap CMS native `editorial_workflow` for article publishing.

## Editorial lifecycle

Decap manages the lifecycle directly in the CMS UI:

- Draft
- In Review
- Ready
- Publish

When you click **Publish**, Decap merges the entry PR into `main`.

When `publish_mode: editorial_workflow` is enabled, saving a Decap draft creates or updates an unpublished branch and PR for that entry. In this repo, automated intake drafts should use the same model with branch names shaped like `cms/articles/<slug>`.
Automated intake PRs must also carry the `decap-cms/draft` label. A matching branch name on its own is not enough for Decap to treat the PR as a workflow entry.

## Three draft concepts

- `Decap draft`: an unpublished editorial-workflow branch and PR.
- `draft: true`: a merged article that stays hidden from public output.
- `GitHub draft PR`: a GitHub review setting only, not a Decap workflow state.

## Visibility model

Public visibility is controlled by article frontmatter:

- `draft: true` keeps the article non-public
- `draft: false` (or omitted `draft`) allows public generation

Important: Decap workflow status and site visibility are separate concepts. A merged entry with `draft: true` stays hidden on the public site.

## GitHub Actions model

The publishing pipeline is intentionally minimal:

1. PR CI runs `npm run check:site`.
2. Pushes to `main` run Pages build + deploy.
3. No custom Decap auto-merge workflow is used.
4. Content Writer may run first to create `ready_for_upload/<folder>/<slug>-content-bundle.md` as an intake artifact.
5. Content Publisher should validate an existing intake bundle before article assembly, reuse it when valid, and stop for a Writer rerun when an existing bundle is invalid.
6. Content Publisher automation should use `/Users/kevin/Repos/Gotlandstider/gotlandstider-ai` as its only Codex workspace and create a dedicated clean site worktree or clone for this repo before PR creation so the diff stays limited to one article source file plus, when present, one copied cover asset under `content/`.
7. Content Publisher should upload the YouTube video before article assembly when a video-backed draft is possible. A final uploader result of `status: "partial"` means the upload failed in a reachable runtime, while `status: "blocked"` means the runtime could not reach Google OAuth or the YouTube API even after the elevated-network retry.
8. Automation runs should use the built-in GitHub plugin to create or reuse the branch and PR, and they should apply `decap-cms/draft`, `codex`, and `codex-automation` labels there. The local `publisher:open-pr` helper remains a manual fallback for operator-driven CLI runs.
9. Automation should treat successful local `publisher:preflight` as the hard gate and report remote CI separately when plugin-visible status data is incomplete.

If a partial or blocked draft PR is rerun later, it should reuse the same `cms/articles/<slug>` branch and update the existing Decap workflow entry instead of opening a second PR for the same slug.

## Branch protection

Use branch protection on `main` with:

1. pull requests required
2. required status check `validate-and-build`

This keeps Decap and non-Decap changes on the same reviewed merge path.
Automation should not claim a PR is green unless the runtime can positively verify remote CI.

## Pages artifact note

`content/articles/` is excluded from the Pages artifact on purpose.
That does not affect Decap CMS because Decap works against the hosted Git repository, not the deployed Pages bundle.

## One-time cleanup for existing `draft: true` entries on `main`

If an older entry is already on `main` with `draft: true`, choose one:

- keep hidden for now, or
- set `draft: false` in a follow-up PR to publish it.

List current entries:

```bash
rg -n "^draft:\s*true$" content/articles/*.md
```
