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

The migration is intentionally split into small, reviewable pull requests so each step is safe to test and easy to roll back.

See [docs/publishing-architecture.md](docs/publishing-architecture.md) for the implementation approach and folder responsibilities.
See [docs/publishing-workflow.md](docs/publishing-workflow.md) for the Decap editorial publishing workflow and copy-paste content templates.
See [docs/decap-cms.md](docs/decap-cms.md) for the Decap lifecycle model and branch protection guidance.

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

## Deployment

GitHub Pages deployment is handled by [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). On pushes to `main`, it:

- installs dependencies with `npm ci`
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

Public SEO scope is intentionally limited for now:

- the sitemap includes the homepage, `/articles/`, and public article routes
- homepage structured data includes the public homepage videos derived from video-backed articles

Manual repo setup for the first deploy:

1. In GitHub repo settings, open Pages.
2. Set the build and deployment source to GitHub Actions if it is still publishing from a branch.
3. Merge the deploy workflow PR and confirm the first Actions deploy completes successfully.

## Publishing workspace folders

- `content/articles/`: article source files
- `generated/content/`: generated indexes consumed by the site
- `scripts/`: validation and build scripts
- `templates/`: static page templates

## Notes

- `CNAME` must remain in place for GitHub Pages and the custom domain.
- Existing URLs, assets, and homepage behavior should stay stable until later migration PRs explicitly change them.
- The recommended publishing workflow uses Decap editorial workflow states and manual Publish in Decap.
- Set `draft: true` only when you intentionally want a merged article to stay hidden from public output.
