import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildArticlePages, buildPages, writeArticlePages, writePages } from "../scripts/build-pages.mjs";
import { renderArticleArchivePage, renderArticleDetailPage } from "../scripts/lib/article-rendering.mjs";
import { validateContentCollections } from "../scripts/lib/content-validation.mjs";

test("buildArticlePages returns archive and detail pages for published articles", async () => {
  const result = await buildArticlePages(process.cwd());
  const publishedArticleCount = await countPublishedArticles(process.cwd());

  assert.equal(result.articles.length, publishedArticleCount);
  assert.equal(result.pages.length, publishedArticleCount + 1);

  const archivePage = result.pages.find((page) => page.outputPath.endsWith(path.join("articles", "index.html")));
  const detailPage = result.pages.find((page) =>
    page.outputPath.endsWith(path.join("articles", "arets-loppis-favoriter", "index.html")),
  );

  assert.ok(archivePage);
  assert.ok(detailPage);
  assert.match(archivePage.html, /Arkiv från ön/);
  assert.match(archivePage.html, /Årets loppis-favoriter/);
  assert.match(archivePage.html, /aspect-video/);
  assert.match(archivePage.html, /line-clamp-2/);
  assert.match(archivePage.html, /Loppis/);
  assert.match(archivePage.html, /Gotland • Inredning/);
  assert.match(archivePage.html, /<footer id="contact"/);
  assert.match(archivePage.html, /src="\/navscripts\.js"/);
  assert.match(archivePage.html, /href="\/#stories" class="hover:text-gotland-rust transition-colors">Upplevelser</);
  assert.match(archivePage.html, /href="\/#house" class="hover:text-gotland-rust transition-colors">Sommarhuset</);
  assert.match(archivePage.html, /href="\/articles\/" class="font-semibold text-gotland-rust transition-colors"/);
  assert.match(detailPage.html, /story-loppisar-gotland\.mp4/);
  assert.match(detailPage.html, /aspect-\[9\/16\]/);
  assert.match(detailPage.html, /Loppis/);
  assert.match(detailPage.html, /Gotland • Inredning/);
  assert.match(detailPage.html, /Instagram/);
  assert.match(detailPage.html, /TikTok/);
  assert.match(detailPage.html, /flex flex-col gap-10 lg:grid lg:grid-cols-\[minmax\(0,1fr\)_minmax\(280px,360px\)\] lg:items-start/);
  assert.match(detailPage.html, /hidden lg:block/);
  assert.match(detailPage.html, /lg:hidden/);
  assert.match(detailPage.html, /Fler upplevelser/);
  assert.match(detailPage.html, /min-w-\[72vw\]/);
  assert.match(detailPage.html, /lg:grid-cols-2/);
  assert.match(detailPage.html, /flex h-full flex-col/);
  assert.match(detailPage.html, /line-clamp-2 font-serif text-base leading-snug/);
  assert.match(detailPage.html, /href="\/articles\/en-strand-for-stora-och-sma\/"/);
  assert.match(detailPage.html, /href="\/articles\/fem-platser-att-besoka-pa-gotland-2026\/"/);
  assert.match(detailPage.html, /href="\/articles\/musikquiz-och-god-mat-vid-stranden\/"/);
  assert.match(
    detailPage.html,
    /class="flex flex-wrap gap-3"[\s\S]*hidden lg:block[\s\S]*class="space-y-10 lg:col-start-2"/,
  );
  assert.match(
    detailPage.html,
    /class="space-y-10 lg:col-start-2"[\s\S]*aspect-\[9\/16\][\s\S]*hidden lg:block space-y-5[\s\S]*Fler upplevelser/,
  );
  assert.match(detailPage.html, /lg:hidden[\s\S]*mt-12 lg:hidden space-y-5[\s\S]*Fler upplevelser/);
  assert.doesNotMatch(detailPage.html, />Arkiv<\/p>/);
  assert.doesNotMatch(detailPage.html, /Ett stenkast från Visby hittar du stranden Snäck/);
  assert.doesNotMatch(detailPage.html, /Publicerad/);
  assert.doesNotMatch(detailPage.html, /Lokalt videoarkiv/);
  assert.doesNotMatch(detailPage.html, /<img[^>]+story-loppisar-gotland\.webp/);
  assert.match(detailPage.html, /<footer id="contact"/);
  assert.match(detailPage.html, /href="\/articles\/" class="font-semibold text-gotland-rust transition-colors"/);
});

test("writeArticlePages writes deterministic article pages", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-build-pages-"));

  try {
    await Promise.all([
      fs.cp(path.join(process.cwd(), "content"), path.join(tempDir, "content"), { recursive: true }),
      fs.cp(path.join(process.cwd(), "templates"), path.join(tempDir, "templates"), { recursive: true }),
    ]);

    const firstRun = await writeArticlePages(tempDir);
    const secondRun = await writeArticlePages(tempDir);

    assert.deepEqual(secondRun.articles, firstRun.articles);
    assert.equal(secondRun.pages.length, firstRun.pages.length);
    await fs.access(path.join(tempDir, "articles", "index.html"));
  } finally {
    await removeTempDir(tempDir);
  }
});

test("buildPages returns article routes only", async () => {
  const result = await buildPages(process.cwd());
  const publishedArticleCount = await countPublishedArticles(process.cwd());

  assert.equal(result.articles.length, publishedArticleCount);
  assert.equal(result.pages.length, publishedArticleCount + 1);
});

test("writePages writes deterministic article pages", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-build-pages-"));

  try {
    await Promise.all([
      fs.cp(path.join(process.cwd(), "content"), path.join(tempDir, "content"), { recursive: true }),
      fs.cp(path.join(process.cwd(), "templates"), path.join(tempDir, "templates"), { recursive: true }),
    ]);

    const firstRun = await writePages(tempDir);
    const secondRun = await writePages(tempDir);

    assert.deepEqual(secondRun.articles, firstRun.articles);
    assert.equal(secondRun.pages.length, firstRun.pages.length);

    const [articleArchiveHtml, articleDetailHtml] = await Promise.all([
      fs.readFile(path.join(tempDir, "articles", "index.html"), "utf8"),
      fs.readFile(path.join(tempDir, "articles", "arets-loppis-favoriter", "index.html"), "utf8"),
    ]);

    assert.match(articleArchiveHtml, /Arkiv från ön/);
    assert.match(articleArchiveHtml, /<footer id="contact"/);
    assert.match(articleArchiveHtml, /src="\/navscripts\.js"/);
    assert.match(articleDetailHtml, /Årets loppis-favoriter/);
    assert.match(articleDetailHtml, /story-loppisar-gotland\.webm/);
    assert.match(articleDetailHtml, /Fler upplevelser/);
    assert.match(articleDetailHtml, /<footer id="contact"/);
  } finally {
    await removeTempDir(tempDir);
  }
});

test("buildPages treats articles without draft as published", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-build-pages-"));

  try {
    await Promise.all([
      fs.cp(path.join(process.cwd(), "content"), path.join(tempDir, "content"), { recursive: true }),
      fs.cp(path.join(process.cwd(), "templates"), path.join(tempDir, "templates"), { recursive: true }),
    ]);

    await fs.writeFile(
      path.join(tempDir, "content", "articles", "artikel-utan-draft.md"),
      `---
title: Artikel utan draft
slug: artikel-utan-draft
excerpt: Kort text
publishedAt: 2026-03-22
updatedAt: 2026-03-22
heroImage: /content/hero-coastline.webp
tags:
  - Guide
featured: false
---

Innehåll.
`,
      "utf8",
    );

    const result = await buildPages(tempDir);
    const missingDraftArticle = result.articles.find((article) => article.slug === "artikel-utan-draft");

    assert.ok(missingDraftArticle);
    assert.equal(missingDraftArticle.draft, false);
    assert.ok(
      result.pages.some((page) =>
        page.outputPath.endsWith(path.join("articles", "artikel-utan-draft", "index.html")),
      ),
    );
  } finally {
    await removeTempDir(tempDir);
  }
});

test("renderArticleDetailPage supports external embeds for video-backed articles", () => {
  const html = renderArticleDetailPage({
    template: `
      <html>
        <head><title>{{pageTitle}}</title></head>
        <body>{{tagRow}}{{mediaBlock}}{{socialLinks}}{{desktopBodySection}}{{desktopRelatedSection}}{{mobileBodySection}}{{mobileRelatedSection}}</body>
      </html>
    `,
    article: {
      title: "Extern video",
      excerpt: "Beskrivning",
      publishedAt: "2026-03-15",
      updatedAt: "2026-03-15",
      heroImage: "/content/story-5platser-gotland.webp",
      tags: ["Guide"],
      video: {
        provider: "youtube",
        embedUrl: "https://www.youtube.com/embed/example123",
        thumbnail: "/content/story-5platser-gotland.webp",
        socialLinks: {
          instagram: "https://www.instagram.com/example/",
          tiktok: null,
        },
      },
      urlPath: "/articles/extern-video/",
      relatedArticles: [
        {
          title: "Relaterad artikel",
          excerpt: "Kort beskrivning som inte ska synas.",
          heroImage: "/content/story-loppisar-gotland.webp",
          tags: ["Gotland", "Loppis"],
          urlPath: "/articles/relaterad-artikel/",
        },
      ],
      body: "Brödtext.",
    },
  });

  assert.match(html, /hidden lg:block/);
  assert.match(html, /lg:hidden/);
  assert.match(html, /hidden lg:block space-y-5/);
  assert.match(html, /mt-12 lg:hidden space-y-5/);
  assert.doesNotMatch(html, />Arkiv<\/p>/);
  assert.match(html, /aspect-\[9\/16\]/);
  assert.match(html, /iframe/);
  assert.match(html, /youtube\.com\/embed\/example123/);
  assert.match(html, /Guide/);
  assert.match(html, /Instagram/);
  assert.match(html, /Fler upplevelser/);
  assert.match(html, /Relaterad artikel/);
  assert.match(html, /flex h-full flex-col/);
  assert.match(html, /line-clamp-2 font-serif text-base leading-snug/);
  assert.doesNotMatch(html, /Kort beskrivning som inte ska synas/);
  assert.doesNotMatch(html, /Publicerad/);
});

test("renderArticleArchivePage omits empty archive tag separators for short tag lists", () => {
  const html = renderArticleArchivePage({
    template: "<html><body>{{articleCards}}</body></html>",
    articles: [
      {
        title: "Kort tagglista",
        excerpt: "Kort beskrivning",
        publishedAt: "2026-03-15",
        heroImage: "/content/hero-coastline.webp",
        tags: ["Ensamtagg"],
        urlPath: "/articles/kort-tagglista/",
      },
      {
        title: "Tvataggar",
        excerpt: "Kort beskrivning",
        publishedAt: "2026-03-16",
        heroImage: "/content/hero-coastline.webp",
        tags: ["Plats", "Badge"],
        urlPath: "/articles/tvataggar/",
      },
    ],
  });

  assert.match(html, />Ensamtagg</);
  assert.match(html, />Badge</);
  assert.match(html, />Plats</);
  assert.doesNotMatch(html, /Ensamtagg •/);
  assert.doesNotMatch(html, /Plats •/);
});

test("renderArticleDetailPage applies archive-style detail tags without empty separators", () => {
  const singleTagHtml = renderArticleDetailPage({
    template: "<html><body>{{tagRow}}</body></html>",
    article: {
      title: "Kort tagglista",
      excerpt: "Kort beskrivning",
      publishedAt: "2026-03-15",
      updatedAt: "2026-03-16",
      heroImage: "/content/hero-coastline.webp",
      tags: ["Ensamtagg"],
      urlPath: "/articles/kort-tagglista/",
      body: "Brödtext.",
    },
  });

  const pairedTagHtml = renderArticleDetailPage({
    template: "<html><body>{{tagRow}}</body></html>",
    article: {
      title: "Flera taggar",
      excerpt: "Kort beskrivning",
      publishedAt: "2026-03-15",
      updatedAt: "2026-03-16",
      heroImage: "/content/hero-coastline.webp",
      tags: ["Plats", "Badge", "Tema"],
      urlPath: "/articles/flera-taggar/",
      body: "Brödtext.",
    },
  });

  assert.match(singleTagHtml, />Ensamtagg</);
  assert.match(pairedTagHtml, />Badge</);
  assert.match(pairedTagHtml, /Plats • Tema/);
  assert.doesNotMatch(singleTagHtml, /Ensamtagg •/);
});

test("renderArticleDetailPage omits social links and video media for non-video articles", () => {
  const html = renderArticleDetailPage({
    template: `
      <html>
        <body>{{tagRow}}{{socialLinks}}{{mediaBlock}}{{desktopBodySection}}{{desktopRelatedSection}}{{mobileBodySection}}{{mobileRelatedSection}}</body>
      </html>
    `,
    article: {
      title: "Artikel",
      excerpt: "Beskrivning",
      publishedAt: "2026-03-15",
      updatedAt: "2026-03-16",
      heroImage: "/content/hero-coastline.webp",
      tags: ["Ljugarn", "Sommarhus", "Arkitektur"],
      urlPath: "/articles/artikel/",
      relatedArticles: [
        {
          title: "Relaterad artikel",
          excerpt: "Kort beskrivning som inte ska synas.",
          heroImage: "/content/story-loppisar-gotland.webp",
          tags: ["Gotland", "Loppis"],
          urlPath: "/articles/relaterad-artikel/",
        },
      ],
      body: "Brödtext.",
    },
  });

  assert.match(html, /Sommarhus/);
  assert.match(html, /Ljugarn • Arkitektur/);
  assert.doesNotMatch(html, /Instagram/);
  assert.doesNotMatch(html, /<video/);
  assert.doesNotMatch(html, /iframe/);
  assert.match(html, /hidden lg:block/);
  assert.match(html, /lg:hidden/);
  assert.match(html, /hidden lg:block space-y-5/);
  assert.match(html, /mt-12 lg:hidden space-y-5/);
  assert.match(html, /Fler upplevelser/);
  assert.match(html, /<img/);
});

test("renderArticleDetailPage supports non-video articles", () => {
  const html = renderArticleDetailPage({
    template: `
      <html>
        <body>{{tagRow}}{{desktopBodySection}}{{mediaBlock}}{{desktopRelatedSection}}{{mobileBodySection}}{{mobileRelatedSection}}</body>
      </html>
    `,
    article: {
      title: "Artikel",
      excerpt: "Beskrivning",
      publishedAt: "2026-03-15",
      updatedAt: "2026-03-16",
      heroImage: "/content/hero-coastline.webp",
      tags: ["Guide"],
      urlPath: "/articles/artikel/",
      body: "Brödtext.",
    },
  });

  assert.match(html, /Guide/);
  assert.match(html, /hidden lg:block/);
  assert.match(html, /lg:hidden/);
  assert.doesNotMatch(html, /iframe/);
  assert.doesNotMatch(html, /Publicerad/);
  assert.match(html, /Brödtext/);
});

test("renderArticleDetailPage limits related items to available articles and excludes excerpts", () => {
  const html = renderArticleDetailPage({
    template: "<html><body>{{desktopRelatedSection}}{{mobileRelatedSection}}</body></html>",
    article: {
      title: "Artikel",
      excerpt: "Beskrivning",
      publishedAt: "2026-03-15",
      updatedAt: "2026-03-16",
      heroImage: "/content/hero-coastline.webp",
      tags: ["Guide"],
      urlPath: "/articles/artikel/",
      relatedArticles: [
        {
          title: "Relaterad ett",
          excerpt: "Första utdraget.",
          heroImage: "/content/story-loppisar-gotland.webp",
          tags: ["Gotland", "Loppis"],
          urlPath: "/articles/relaterad-ett/",
        },
        {
          title: "Relaterad två",
          excerpt: "Andra utdraget.",
          heroImage: "/content/story-strand-snack.webp",
          tags: ["Visby", "Stränder"],
          urlPath: "/articles/relaterad-tva/",
        },
      ],
      body: "Brödtext.",
    },
  });

  assert.match(html, /Relaterad ett/);
  assert.match(html, /Relaterad två/);
  assert.match(html, /flex h-full flex-col/);
  assert.match(html, /line-clamp-2 font-serif text-base leading-snug/);
  assert.doesNotMatch(html, /Första utdraget/);
  assert.doesNotMatch(html, /Andra utdraget/);
});

async function removeTempDir(tempDir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error.code !== "ENOTEMPTY" || attempt === 4) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

async function countPublishedArticles(rootDir) {
  const validation = await validateContentCollections(rootDir);
  return validation.articles.filter((article) => !article.data.draft).length;
}
