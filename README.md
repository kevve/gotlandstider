# Gotlandstider

Gotlandstider is the public website for [www.gotlandstider.se](https://www.gotlandstider.se), currently built as a simple static site with HTML, JavaScript, and Tailwind-generated CSS.

The current production site continues to be served from the repository root. This repo is being migrated incrementally toward an agent-friendly publishing setup where articles can be added through structured content files and deployed automatically, without breaking the existing site along the way.

## Current site structure

- `index.html`: current homepage
- `navscripts.js`: navigation and scroll interactions
- `storyscripts.js`: story modal/archive interactions
- `src/input.css` -> `output.css`: Tailwind source and generated CSS
- `content/`: images and current legacy video assets

## Publishing migration direction

The target state is a Git-as-CMS workflow with:

- articles stored as Markdown with YAML front matter
- optional nested video metadata on article entries for embeds, legacy hosted clips, and homepage story cards
- generated JSON indexes committed under `generated/content/`
- static archive/detail pages generated under `/articles/`
- GitHub Actions used for validation, build, and deployment

For all content, Decap CMS editorial workflow status controls whether changes are unpublished (`Draft`, `In Review`, `Ready`) or merged (`Publish`).
The frontmatter flag `draft` is an optional visibility override and defaults to `false`.
GitHub draft PRs are separate from both of those concepts and are not used as the CMS publishing state.

The migration is intentionally split into small, reviewable pull requests so each step is safe to test and easy to roll back.

See [docs/publishing-architecture.md](docs/publishing-architecture.md) for the implementation approach and folder responsibilities.
See [docs/publishing-workflow.md](docs/publishing-workflow.md) for the Decap editorial publishing workflow and copy-paste content templates.
See [docs/decap-cms.md](docs/decap-cms.md) for the exact relationship between Decap drafts, `draft: true`, and GitHub PRs.

## Local development

Install dependencies:

```bash
npm install
```

Build CSS once:

```bash
npm run build
```

Watch CSS during development:

```bash
npm run dev
```

Build the full site locally:

```bash
npm run build:site
```

Run the full validation, test, and static build pipeline locally:

```bash
npm run check:site
```

The `publisher:*` commands in this repo are stable wrappers around the canonical helper scripts in the sibling `gotlandstider-ai` checkout.
If you run them from a detached worktree or another custom layout, set `GOTLANDSTIDER_AI_ROOT` to the canonical `gotlandstider-ai` checkout first.
`npm run test:publisher` uses the same centralized test suite locally and skips cleanly in environments where that checkout is not present, such as the standalone site-repo CI job.
The installed Codex skills `content-writer` and `content-publisher` should be managed as symlinks, not edited in place under `$CODEX_HOME/skills/`.
Automation runs should use the built-in GitHub plugin for branch, PR, and label work, while `publisher:open-pr` remains a manual CLI fallback.
Automation should use `/Users/kevin/Repos/Gotlandstider/gotlandstider-ai` as its only Codex workspace and create the clean site worktree explicitly from `/Users/kevin/Repos/Gotlandstider/gotlandstider`.
For automation, successful local `publisher:preflight` is the hard gate and remote CI may be reported separately when it is not directly verifiable.

Prepare a clean worktree for manual Content Publisher runs:

```bash
npm run publisher:prepare -- --path <publisher-worktree-path>
```

Preflight a generated article branch without committing generated output:

```bash
npm run publisher:preflight -- --expected content/articles/<slug>.md
```

Open or reuse the Decap editorial-workflow PR and enforce the required label for manual CLI runs:

```bash
npm run publisher:open-pr -- --branch cms/articles/<slug> --title "Create Decap draft article: <title>" --body "Decap draft article generated from the intake folder transcript via $content-writer."
```

## Deployment

GitHub Pages deployment is handled by [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). On pushes to `main`, it:

- installs dependencies with `npm ci`
- validates content
- rebuilds the full public site with `npm run build:site`
- stages the public site into a GitHub Pages artifact
- deploys that artifact with GitHub Actions

The staged Pages artifact includes the production files and directories the site currently needs:

- `index.html`
- `admin/`
- `articles/`
- `generated/`
- `content/` asset files only
- `fonts/`
- `navscripts.js`
- `storyscripts.js`
- `output.css`
- `favicon-v2.svg`
- `robots.txt`
- `sitemap.xml`
- `CNAME`

Source content files remain in the repo, but the deploy artifact excludes:

- `content/articles/`

This keeps Markdown article sources private even though the rest of `/content/` is still used for public assets.
It does not affect Decap CMS because the CMS reads and writes the GitHub repository directly rather than the Pages artifact.

Public SEO scope is intentionally limited for now:

- the sitemap includes the homepage, `/articles/`, and public article routes
- homepage structured data includes the public homepage videos derived from video-backed articles

Manual repo setup for the first deploy:

1. In GitHub repo settings, open Pages.
2. Set the build and deployment source to GitHub Actions if it is still publishing from a branch.
3. Merge the deploy workflow PR and confirm the first Actions deploy completes successfully.

## Planned workspace folders

- `content/articles/`: future article source files
- `generated/content/`: future generated indexes consumed by the site
- `scripts/`: future validation/build scripts
- `templates/`: future static page templates

## Notes

- `CNAME` must remain in place for GitHub Pages and the custom domain.
- Existing URLs, assets, and homepage behavior should stay stable until later migration PRs explicitly change them.
- The recommended publishing workflow uses Decap editorial workflow states and manual Publish in Decap.
- Automated intake PRs must carry the `decap-cms/draft` label to appear in Decap Workflow. Automation uses the built-in GitHub plugin to apply and verify that label, while the `publisher:open-pr` helper remains available for manual CLI runs.
- Set `draft: true` only when you intentionally want a merged article to stay hidden from public output.
- Intake automation should run from `/Users/kevin/Repos/Gotlandstider/gotlandstider-ai` as a single Codex workspace and create a dedicated clean site worktree or clone for `/Users/kevin/Repos/Gotlandstider/gotlandstider` so publisher scope checks can stay limited to a single article source file.
- Intake automation may still create a plain draft article when the uploader finishes with `status: "partial"` or `status: "blocked"`; both outcomes leave the intake folder in place for a later rerun.
- Intake automation should report remote CI separately when it cannot positively verify that status in the runtime.
- Edit shared Codex skills and publisher helper implementations in the sibling `gotlandstider-ai` repo; the installed Codex skills directory should only contain installed symlinks.
