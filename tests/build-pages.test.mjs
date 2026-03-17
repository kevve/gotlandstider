import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildArticlePages, buildPages, writeArticlePages, writePages } from "../scripts/build-pages.mjs";
import { renderArticleDetailPage } from "../scripts/lib/article-rendering.mjs";

test("buildArticlePages returns archive and detail pages for published articles", async () => {
  const result = await buildArticlePages(process.cwd());

  assert.equal(result.articles.length, 4);
  assert.equal(result.pages.length, 5);

  const archivePage = result.pages.find((page) => page.outputPath.endsWith(path.join("articles", "index.html")));
  const detailPage = result.pages.find((page) =>
    page.outputPath.endsWith(path.join("articles", "musikquiz-och-god-mat-vid-stranden", "index.html")),
  );

  assert.ok(archivePage);
  assert.ok(detailPage);
  assert.match(archivePage.html, /Arkiv från ön/);
  assert.match(archivePage.html, /Årets loppis-favoriter/);
  assert.match(archivePage.html, /<footer id="contact"/);
  assert.match(archivePage.html, /src="\/navscripts\.js"/);
  assert.match(archivePage.html, /href="\/#stories" class="hover:text-gotland-rust transition-colors">Upplevelser</);
  assert.match(archivePage.html, /href="\/#house" class="hover:text-gotland-rust transition-colors">Sommarhuset</);
  assert.match(archivePage.html, /href="\/articles\/" class="font-semibold text-gotland-rust transition-colors"/);
  assert.match(detailPage.html, /Lokalt videoarkiv/);
  assert.match(detailPage.html, /story-brunan-ljugarn\.mp4/);
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

  assert.equal(result.articles.length, 4);
  assert.equal(result.pages.length, 5);
});

test("writePages writes deterministic article pages and removes videos directory", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-build-pages-"));

  try {
    await Promise.all([
      fs.cp(path.join(process.cwd(), "content"), path.join(tempDir, "content"), { recursive: true }),
      fs.cp(path.join(process.cwd(), "templates"), path.join(tempDir, "templates"), { recursive: true }),
    ]);
    await fs.mkdir(path.join(tempDir, "videos", "old"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "videos", "old", "index.html"), "old", "utf8");

    const firstRun = await writePages(tempDir);
    const secondRun = await writePages(tempDir);

    assert.deepEqual(secondRun.articles, firstRun.articles);
    assert.equal(secondRun.pages.length, firstRun.pages.length);
    await assert.rejects(fs.access(path.join(tempDir, "videos", "old", "index.html")));

    const [articleArchiveHtml, articleDetailHtml] = await Promise.all([
      fs.readFile(path.join(tempDir, "articles", "index.html"), "utf8"),
      fs.readFile(path.join(tempDir, "articles", "arets-loppis-favoriter", "index.html"), "utf8"),
    ]);

    assert.match(articleArchiveHtml, /Arkiv från ön/);
    assert.match(articleArchiveHtml, /<footer id="contact"/);
    assert.match(articleArchiveHtml, /src="\/navscripts\.js"/);
    assert.match(articleDetailHtml, /Årets loppis-favoriter/);
    assert.match(articleDetailHtml, /story-loppisar-gotland\.webm/);
    assert.match(articleDetailHtml, /<footer id="contact"/);
  } finally {
    await removeTempDir(tempDir);
  }
});

test("renderArticleDetailPage supports external embeds for video-backed articles", () => {
  const html = renderArticleDetailPage({
    template: `
      <html>
        <head><title>{{pageTitle}}</title></head>
        <body>{{mediaBlock}}{{socialLinks}}</body>
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
      body: "Brödtext.",
    },
  });

  assert.match(html, /iframe/);
  assert.match(html, /youtube\.com\/embed\/example123/);
  assert.match(html, /Instagram/);
});

test("renderArticleDetailPage supports non-video articles", () => {
  const html = renderArticleDetailPage({
    template: `
      <html>
        <body>{{contentLabel}}{{mediaBlock}}{{articleBody}}</body>
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

  assert.match(html, /Artikel/);
  assert.doesNotMatch(html, /iframe/);
  assert.match(html, /Brödtext/);
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
