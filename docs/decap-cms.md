# Decap CMS workflow

This repository uses Decap editorial workflow states via pull request labels instead of storing a separate workflow status in article front matter.

## State contract

Decap state is represented by pull request labels on `cms/articles/*` branches:

- `decap-cms/draft`
- other Decap editorial labels for non-draft states

Content publish visibility is still controlled only by article front matter:

- `draft: true` keeps the article non-public
- `draft: false` allows public generation

## Draft auto-merge behavior

Draft PRs are auto-merged by [`.github/workflows/cms-draft-automerge.yml`](/Users/kevin/Repos/Gotlandstider/gotlandstider/.github/workflows/cms-draft-automerge.yml) when all checks pass.

A PR is eligible only when all conditions are true:

1. base branch is `main`
2. head branch starts with `cms/articles/`
3. PR has label `decap-cms/draft`
4. all changed markdown files in `content/articles/` still contain `draft: true`
5. changed files are limited to `content/articles/*.md` and `content/` asset files
6. CI check run `validate-and-build` is successful on the PR head commit

If eligible, the workflow:

1. squash merges the PR
2. deletes the `cms/articles/*` source branch

Non-draft Decap states stay manual by design.

## Main branch safety

Before relying on auto-merge, configure branch protection on `main` with:

1. pull requests required
2. required status check `validate-and-build`

This keeps non-draft and non-CMS changes on the normal reviewed merge path.
