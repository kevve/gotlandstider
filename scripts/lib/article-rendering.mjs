import fs from "node:fs/promises";
import path from "node:path";

import { loadSiteShell, renderSiteShell } from "./site-shell.mjs";

const SITE_URL = "https://www.gotlandstider.se";
const CSS_HREF = "/output.css?v=20260313-2";
const FAVICON_HREF = "/favicon-v2.svg";

export async function loadTemplate(rootDir, templateName) {
  const templatePath = path.join(rootDir, "templates", templateName);
  return fs.readFile(templatePath, "utf8");
}

export function renderArticleArchivePage({ template, articles, shell = {} }) {
  const articleCards = articles
    .map((article) => {
      const coverImage = article.video?.thumbnail ?? article.heroImage;
      const tagDisplay = getArchiveTagDisplay(article.tags);
      const metadata = [tagDisplay.metaPrefix, tagDisplay.metaSuffix].filter(Boolean).join(" • ");

      return `
        <article class="group overflow-hidden rounded-[1.5rem] border border-gotland-stoneDark bg-white/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <a href="${escapeAttribute(article.urlPath)}" class="flex h-full flex-col">
            <div class="relative aspect-video overflow-hidden bg-gotland-stoneDark/30">
              <div class="absolute inset-0 bg-gotland-deep/10 transition-colors z-10 group-hover:bg-transparent"></div>
              <div class="absolute left-3 top-3 z-20 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${getArchiveBadgeClass(
                tagDisplay.badge,
              )}">${escapeHtml(tagDisplay.badge)}</div>
              <img
                src="${escapeAttribute(coverImage)}"
                alt="${escapeAttribute(article.title)}"
                class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
            </div>
            <div class="flex flex-1 flex-col justify-between space-y-4 p-4 md:p-5">
              <div class="space-y-2">
                ${
                  metadata
                    ? `<p class="text-xs font-medium uppercase tracking-wide text-gotland-moss">${escapeHtml(metadata)}</p>`
                    : ""
                }
                <h2 class="font-serif text-2xl leading-snug text-gotland-deep transition-colors group-hover:text-gotland-rust">${escapeHtml(
                  article.title,
                )}</h2>
                <p class="line-clamp-2 text-sm leading-relaxed text-gray-600">${escapeHtml(article.excerpt)}</p>
              </div>
              <div class="flex items-center justify-between gap-3 pt-2">
                <p class="text-xs font-medium text-gotland-deep/80">${formatDate(article.publishedAt)}</p>
                <span class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gotland-deep transition-colors group-hover:text-gotland-rust">
                  ${article.video ? "Titta vidare" : "Läs vidare"}
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </div>
          </a>
        </article>
      `;
    })
    .join("");

  const siteShell = renderSiteShell({
    ...shell,
    activeNavKey: "archive",
    brandHref: "/",
  });

  return injectTemplate(template, {
    pageTitle: "Arkiv | Gotlandstider",
    metaDescription:
      "Ett växande arkiv med guider, berättelser, videor och uppdateringar från Gotland, Ljugarn och livet på ön.",
    canonicalUrl: `${SITE_URL}/articles/`,
    ogTitle: "Arkiv | Gotlandstider",
    ogDescription:
      "Utforska Gotlandstiders arkiv med videor, guider, berättelser och uppdateringar från Gotland och Ljugarn.",
    ogImage: `${SITE_URL}${articles[0]?.video?.thumbnail ?? articles[0]?.heroImage ?? "/content/hero-coastline.webp"}`,
    cssHref: CSS_HREF,
    faviconHref: FAVICON_HREF,
    pageHeading: "Arkiv från ön",
    lead:
      "Ett växande arkiv med tips, guider, berättelser och glimtar från Gotland, Ljugarn och våra favoritplatser på ön.",
    articleCards,
    siteHeader: siteShell.siteHeader,
    siteFooter: siteShell.siteFooter,
    siteScripts: siteShell.siteScripts,
  });
}

export function renderArticleDetailPage({ template, article, shell = {} }) {
  const isVideoArticle = Boolean(article.video);
  const mediaBlock = isVideoArticle ? renderVideoMedia(article) : "";
  const socialLinks = isVideoArticle ? renderSocialLinks(article.video.socialLinks) : "";
  const siteShell = renderSiteShell({
    ...shell,
    activeNavKey: "archive",
    brandHref: "/",
  });

  return injectTemplate(template, {
    pageTitle: `${article.title} | Gotlandstider`,
    metaDescription: article.excerpt,
    canonicalUrl: `${SITE_URL}${article.urlPath}`,
    ogType: isVideoArticle ? "video.other" : "article",
    ogTitle: `${article.title} | Gotlandstider`,
    ogDescription: article.excerpt,
    ogImage: `${SITE_URL}${article.video?.thumbnail ?? article.heroImage}`,
    cssHref: CSS_HREF,
    faviconHref: FAVICON_HREF,
    backHref: "/articles/",
    backLabel: "Tillbaka till arkivet",
    contentLabel: isVideoArticle ? getDetailLabel(article) : "Artikel",
    articleTitle: article.title,
    articleExcerpt: article.excerpt,
    publishedLabel: formatDate(article.publishedAt),
    updatedMetaBlock: isVideoArticle
      ? ""
      : `
          <div>
            <dt class="text-xs font-bold uppercase tracking-[0.18em] text-gotland-pine">Uppdaterad</dt>
            <dd class="mt-2 text-base text-gotland-deep">${formatDate(article.updatedAt)}</dd>
          </div>
        `,
    socialLinks,
    coverImage: article.video?.thumbnail ?? article.heroImage,
    coverImageAlt: article.title,
    mediaBlock,
    tagList: article.tags
      .map(
        (tag) =>
          `<li class="rounded-full border border-gotland-stoneDark bg-white/75 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-gotland-pine">${escapeHtml(
            tag,
          )}</li>`,
      )
      .join(""),
    articleBody: renderMarkdown(article.body),
    bodyWrapperClass: isVideoArticle
      ? "mx-auto max-w-3xl space-y-6"
      : "mx-auto max-w-3xl space-y-6",
    bodySectionClass: isVideoArticle
      ? "mt-10 rounded-[2rem] border border-gotland-stoneDark bg-white/65 px-6 py-8 shadow-sm backdrop-blur-sm md:px-10 md:py-12"
      : "mt-14 rounded-[2rem] border border-gotland-stoneDark bg-white/65 px-6 py-8 shadow-sm backdrop-blur-sm md:px-10 md:py-12",
    siteHeader: siteShell.siteHeader,
    siteFooter: siteShell.siteFooter,
    siteScripts: siteShell.siteScripts,
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
    ...(article.data.video ? { video: article.data.video } : {}),
    ...(article.data.homepage ? { homepage: article.data.homepage } : {}),
  };
}

export async function loadPageTemplateBundle(rootDir, templateName) {
  const [template, shell] = await Promise.all([
    loadTemplate(rootDir, templateName),
    loadSiteShell(rootDir),
  ]);

  return {
    template,
    shell,
  };
}

function renderVideoMedia(article) {
  return article.video.provider === "legacy-local" ? renderLegacyVideo(article) : renderEmbeddedVideo(article);
}

function renderLegacyVideo(article) {
  return `
    <div class="mt-14 overflow-hidden rounded-[2rem] border border-gotland-stoneDark bg-gotland-deep shadow-xl">
      <div class="mx-auto max-w-[420px]">
        <div class="aspect-[9/16]">
          <video
            class="h-full w-full object-cover"
            controls
            playsinline
            preload="metadata"
            poster="${escapeAttribute(article.video.thumbnail)}"
          >
            <source src="${escapeAttribute(article.video.legacySources.webm)}" type="video/webm">
            <source src="${escapeAttribute(article.video.legacySources.mp4)}" type="video/mp4">
          </video>
        </div>
      </div>
    </div>
  `;
}

function renderEmbeddedVideo(article) {
  return `
    <div class="mt-14 overflow-hidden rounded-[2rem] border border-gotland-stoneDark bg-gotland-deep shadow-xl">
      <div class="aspect-video">
        <iframe
          class="h-full w-full"
          src="${escapeAttribute(article.video.embedUrl)}"
          title="${escapeAttribute(article.title)}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>
    </div>
  `;
}

function renderSocialLinks(socialLinks) {
  const links = Object.entries(socialLinks ?? {})
    .filter(([, value]) => value)
    .map(([key, value]) => {
      const label = key === "instagram" ? "Instagram" : key === "tiktok" ? "TikTok" : key;
      return `<a href="${escapeAttribute(value)}" class="rounded-full border border-gotland-stoneDark bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-gotland-deep transition-colors hover:text-gotland-rust">${escapeHtml(
        label,
      )}</a>`;
    })
    .join("");

  if (!links) {
    return "";
  }

  return `
    <div class="flex flex-wrap gap-3">
      ${links}
    </div>
  `;
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

function getArchiveTagDisplay(tags) {
  const normalizedTags = (tags ?? []).filter(Boolean);

  if (normalizedTags.length >= 2) {
    return {
      badge: normalizedTags[1],
      metaPrefix: normalizedTags[0] ?? "",
      metaSuffix: normalizedTags[2] ?? "",
    };
  }

  if (normalizedTags.length === 1) {
    return {
      badge: normalizedTags[0],
      metaPrefix: "",
      metaSuffix: "",
    };
  }

  return {
    badge: "Artikel",
    metaPrefix: "",
    metaSuffix: "",
  };
}

function getArchiveBadgeClass(label) {
  return label === "Tips"
    ? "bg-gotland-stone/90 text-gotland-deep"
    : "bg-gotland-rust/90 text-white";
}

function getDetailLabel(article) {
  return article.video.provider === "legacy-local" ? "Lokalt videoarkiv" : "Extern videospelare";
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
