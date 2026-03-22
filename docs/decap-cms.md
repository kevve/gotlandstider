# Decap CMS workflow

This repository uses Decap editorial workflow states via pull request labels instead of storing a separate workflow status in article front matter.

## State contract

Decap state is represented by pull request labels on `cms/articles/*` branches:

- `decap-cms/draft`
- other Decap editorial labels for non-draft states

Content publish visibility is still controlled only by article front matter:

- `draft: true` keeps the article non-public
- `draft: false` allows public generation

Important: Decap can show an entry as Published while the repo entry still has `draft: true`. In this setup, Published in Decap means merged on `main`, not publicly visible on the site.

## Draft auto-merge behavior

Draft PRs are auto-merged by [`.github/workflows/cms-draft-automerge.yml`](../.github/workflows/cms-draft-automerge.yml) only when explicitly opted in.

A PR is eligible only when all conditions are true:

1. base branch is `main`
2. head branch starts with `cms/articles/`
3. PR has label `decap-cms/draft`
4. PR has label `decap-cms/automerge`
5. all changed markdown files in `content/articles/` still contain `draft: true`
6. changed files are limited to `content/articles/*.md` and `content/` asset files
7. branch protection requirements on `main` are satisfied (`mergeable_state` is clean)

If eligible, the workflow:

1. squash merges the PR
2. deletes the `cms/articles/*` source branch

Draft PRs without `decap-cms/automerge` stay open in Workflow by design.
Non-draft Decap states stay manual by design.

## One-time backfill for existing drafts

If an article is already merged on `main`, it appears in Decap Contents as Published and not in Workflow columns.

To move existing repo drafts into Workflow:

1. find all `content/articles/*.md` entries with `draft: true` on `main`
2. create/update `cms/articles/<slug>` branches
3. bump `updatedAt` to the migration date
4. open PRs to `main`
5. apply `decap-cms/draft` label only (do not add `decap-cms/automerge`)

These PRs then appear in Decap Workflow Draft and can be moved through In Review and Ready.

## Front-end handling

No public rendering changes are required for this model.
The site should continue to gate visibility strictly on frontmatter `draft`.
Decap workflow labels are process metadata and should not be used as public rendering input.

## Main branch safety

Before relying on auto-merge, configure branch protection on `main` with:

1. pull requests required
2. required status check `validate-and-build`

This keeps non-draft and non-CMS changes on the normal reviewed merge path.
