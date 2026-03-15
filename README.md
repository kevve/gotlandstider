# Gotlandstider

Gotlandstider is the public website for [www.gotlandstider.se](https://www.gotlandstider.se), currently built as a simple static site with HTML, JavaScript, and Tailwind-generated CSS.

The current production site continues to be served from the repository root. This repo is being migrated incrementally toward an agent-friendly publishing setup where articles and videos can be added through structured content files and deployed automatically, without breaking the existing site along the way.

## Current site structure

- `index.html`: current homepage
- `navscripts.js`: navigation and scroll interactions
- `storyscripts.js`: story modal/archive interactions
- `src/input.css` -> `output.css`: Tailwind source and generated CSS
- `content/`: images and current legacy video assets

## Publishing migration direction

The target state is a Git-as-CMS workflow with:

- articles stored as Markdown with front matter
- videos stored as structured JSON metadata
- generated JSON indexes committed under `generated/content/`
- static archive/detail pages for articles and videos
- GitHub Actions used for validation, build, and deployment

The migration is intentionally split into small, reviewable pull requests so each step is safe to test and easy to roll back.

See [docs/publishing-architecture.md](/Users/kevin/Repos/Gotlandstider/gotlandstider/docs/publishing-architecture.md) for the implementation approach and folder responsibilities.

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

Run the full content and page checks locally:

```bash
npm run validate:content
npm run build:content
npm run test:content
npm run build:pages
npm run test:pages
npm run build
```

## Continuous integration

GitHub Actions CI runs the full validation and static build pipeline on every push and pull request:

- `npm ci`
- `npm run validate:content`
- `npm run build:content`
- `npm run test:content`
- `npm run build:pages`
- `npm run test:pages`
- `npm run build`

Deployment remains separate and will be added in a later PR so CI can be reviewed and rolled back independently.

## Planned workspace folders

- `content/articles/`: future article source files
- `content/videos/`: future video metadata files
- `generated/content/`: future generated indexes consumed by the site
- `scripts/`: future validation/build scripts
- `templates/`: future static page templates

## Notes

- `CNAME` must remain in place for GitHub Pages and the custom domain.
- Existing URLs, assets, and homepage behavior should stay stable until later migration PRs explicitly change them.
