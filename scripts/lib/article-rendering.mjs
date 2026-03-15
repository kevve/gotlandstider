import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://www.gotlandstider.se";
const CSS_HREF = "/output.css?v=20260313-2";
const FAVICON_HREF = "/favicon-v2.svg";

export async function loadTemplate(rootDir, templateName) {
  const templatePath = path.join(rootDir, "templates", templateName);
  return fs.readFile(templatePath, "utf8");
}

export function renderArticleArchivePage({ template, articles }) {
  const articleCards = articles
    .map((article) => {
      const tags = article.tags
        .map(
          (tag) =>
            `<span class="rounded-full border border-gotland-stoneDark bg-gotland-stone px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-gotland-pine">${escapeHtml(
              tag,
            )}</span>`,
        )
        .join("");

      return `
        <article class="group overflow-hidden rounded-[2rem] border border-gotland-stoneDark bg-white/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <a href="${escapeAttribute(article.urlPath)}" class="block">
            <div class="aspect-[4/3] overflow-hidden bg-gotland-stoneDark/30">
              <img
                src="${escapeAttribute(article.heroImage)}"
                alt="${escapeAttribute(article.title)}"
                class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
            </div>
            <div class="space-y-5 p-6 md:p-8">
              <div class="space-y-3">
                <p class="text-xs font-bold uppercase tracking-[0.2em] text-gotland-rust">${formatDate(article.publishedAt)}</p>
                <h2 class="font-serif text-3xl leading-tight text-gotland-deep transition-colors group-hover:text-gotland-pine">${escapeHtml(
                  article.title,
                )}</h2>
                <p class="text-base leading-8 text-gotland-deep/80">${escapeHtml(article.excerpt)}</p>
              </div>
              <div class="flex flex-wrap gap-2">${tags}</div>
              <span class="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-gotland-deep">
                Läs artikel
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </a>
        </article>
      `;
    })
    .join("");

  return injectTemplate(template, {
    pageTitle: "Artiklar | Gotlandstider",
    metaDescription:
      "Redaktionella artiklar från Gotlandstider om Gotland, Ljugarn, upplevelser, hem och sommarhusprojekt.",
    canonicalUrl: `${SITE_URL}/articles/`,
    ogTitle: "Artiklar | Gotlandstider",
    ogDescription:
      "Utforska artiklar från Gotlandstider om Gotland, arkitektur, utflykter och livet på ön.",
    ogImage: `${SITE_URL}${articles[0]?.heroImage ?? "/content/hero-coastline.webp"}`,
    cssHref: CSS_HREF,
    faviconHref: FAVICON_HREF,
    pageHeading: "Artiklar från ön",
    lead:
      "Ett växande arkiv med guider, berättelser och uppdateringar från Gotland och projektet i Ljugarn.",
    articleCards,
  });
}

export function renderArticleDetailPage({ template, article }) {
  return injectTemplate(template, {
    pageTitle: `${article.title} | Gotlandstider`,
    metaDescription: article.excerpt,
    canonicalUrl: `${SITE_URL}${article.urlPath}`,
    ogTitle: `${article.title} | Gotlandstider`,
    ogDescription: article.excerpt,
    ogImage: `${SITE_URL}${article.heroImage}`,
    cssHref: CSS_HREF,
    faviconHref: FAVICON_HREF,
    articleTitle: article.title,
    publishedLabel: formatDate(article.publishedAt),
    updatedLabel: formatDate(article.updatedAt),
    articleExcerpt: article.excerpt,
    heroImage: article.heroImage,
    heroImageAlt: article.title,
    tagList: article.tags
      .map(
        (tag) =>
          `<li class="rounded-full border border-gotland-stoneDark bg-white/75 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-gotland-pine">${escapeHtml(
            tag,
          )}</li>`,
      )
      .join(""),
    articleBody: renderMarkdown(article.body),
    articlePath: article.urlPath,
  });
}

export function renderMarkdown(markdown) {
  const normalized = markdown.trim().replace(/\r\n/g, "\n");
  if (!normalized) {
    return "";
  }

  const blocks = normalized.split(/\n{2,}/);

  return blocks
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim());

      if (lines.every((line) => line.startsWith("- "))) {
        const items = lines
          .map(
            (line) =>
              `<li class="leading-8 text-gotland-deep/85">${renderInlineMarkdown(line.slice(2))}</li>`,
          )
          .join("");
        return `<ul class="ml-6 list-disc space-y-3">${items}</ul>`;
      }

      const headingMatch = lines[0].match(/^(#{1,3})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = renderInlineMarkdown(headingMatch[2]);
        if (level === 1) {
          return `<h1 class="font-serif text-4xl leading-tight text-gotland-deep">${content}</h1>`;
        }
        if (level === 2) {
          return `<h2 class="font-serif text-3xl leading-tight text-gotland-deep">${content}</h2>`;
        }
        return `<h3 class="font-serif text-2xl leading-tight text-gotland-deep">${content}</h3>`;
      }

      return `<p class="text-lg leading-8 text-gotland-deep/85">${renderInlineMarkdown(
        lines.join(" "),
      )}</p>`;
    })
    .join("\n");
}

export function toArticlePageModel(article) {
  return {
    title: article.data.title,
    slug: article.data.slug,
    excerpt: article.data.excerpt,
    publishedAt: article.data.publishedAt,
    updatedAt: article.data.updatedAt,
    heroImage: article.data.heroImage,
    tags: article.data.tags,
    featured: article.data.featured,
    draft: article.data.draft,
    body: article.body,
    urlPath: `/articles/${article.data.slug}/`,
  };
}

function injectTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key];
    return typeof value === "string" ? value : "";
  });
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);

  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, href) => {
    return `<a href="${escapeAttribute(href)}" class="font-semibold text-gotland-rust underline decoration-gotland-rust/50 underline-offset-4 transition-colors hover:text-gotland-bark">${escapeHtml(
      label,
    )}</a>`;
  });

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return html;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
