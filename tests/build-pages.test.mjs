import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildArticlePages, buildPages, buildVideoPages, writeArticlePages, writePages } from "../scripts/build-pages.mjs";
import { renderVideoDetailPage } from "../scripts/lib/video-rendering.mjs";

test("buildArticlePages returns archive and detail pages for published articles", async () => {
  const result = await buildArticlePages(process.cwd());

  assert.equal(result.articles.length, 2);
  assert.equal(result.pages.length, 3);

  const archivePage = result.pages.find((page) => page.outputPath.endsWith(path.join("articles", "index.html")));
  const detailPage = result.pages.find((page) =>
    page.outputPath.endsWith(path.join("articles", "fem-platser-att-besoka-pa-gotland-2026", "index.html")),
  );

  assert.ok(archivePage);
  assert.ok(detailPage);
  assert.match(archivePage.html, /Artiklar från ön/);
  assert.match(archivePage.html, /Projekt Ljugarn - från tomt till sommarhus/);
  assert.match(detailPage.html, /framtida redaktionellt innehåll kan ligga i repot/);
  assert.match(detailPage.html, /Tillbaka till artiklar/);
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

    const [archiveHtml, detailHtml] = await Promise.all([
      fs.readFile(path.join(tempDir, "articles", "index.html"), "utf8"),
      fs.readFile(
        path.join(tempDir, "articles", "projekt-ljugarn-fran-tomt-till-sommarhus", "index.html"),
        "utf8",
      ),
    ]);

    assert.match(archiveHtml, /Artiklar från ön/);
    assert.match(detailHtml, /Projekt Ljugarn - från tomt till sommarhus/);
    assert.match(detailHtml, /När artikelarkivet byggs i senare PR:er/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("buildVideoPages returns archive and detail pages for videos", async () => {
  const result = await buildVideoPages(process.cwd());

  assert.equal(result.videos.length, 4);
  assert.equal(result.pages.length, 5);

  const archivePage = result.pages.find((page) => page.outputPath.endsWith(path.join("videos", "index.html")));
  const detailPage = result.pages.find((page) =>
    page.outputPath.endsWith(path.join("videos", "musikquiz-och-god-mat-vid-stranden", "index.html")),
  );

  assert.ok(archivePage);
  assert.ok(detailPage);
  assert.match(archivePage.html, /Videor från ön/);
  assert.match(archivePage.html, /Årets loppis-favoriter/);
  assert.match(detailPage.html, /Lokalt videoarkiv/);
  assert.match(detailPage.html, /story-brunan-ljugarn\.mp4/);
});

test("buildPages returns both article and video routes", async () => {
  const result = await buildPages(process.cwd());

  assert.equal(result.articles.length, 2);
  assert.equal(result.videos.length, 4);
  assert.equal(result.pages.length, 8);
});

test("writePages writes deterministic article and video pages", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-build-pages-"));

  try {
    await Promise.all([
      fs.cp(path.join(process.cwd(), "content"), path.join(tempDir, "content"), { recursive: true }),
      fs.cp(path.join(process.cwd(), "templates"), path.join(tempDir, "templates"), { recursive: true }),
    ]);

    const firstRun = await writePages(tempDir);
    const secondRun = await writePages(tempDir);

    assert.deepEqual(secondRun.articles, firstRun.articles);
    assert.deepEqual(secondRun.videos, firstRun.videos);
    assert.equal(secondRun.pages.length, firstRun.pages.length);

    const [videoArchiveHtml, videoDetailHtml] = await Promise.all([
      fs.readFile(path.join(tempDir, "videos", "index.html"), "utf8"),
      fs.readFile(path.join(tempDir, "videos", "arets-loppis-favoriter", "index.html"), "utf8"),
    ]);

    assert.match(videoArchiveHtml, /Videor från ön/);
    assert.match(videoDetailHtml, /Årets loppis-favoriter/);
    assert.match(videoDetailHtml, /story-loppisar-gotland\.webm/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("renderVideoDetailPage supports external embeds", () => {
  const html = renderVideoDetailPage({
    template: `
      <html>
        <head><title>{{pageTitle}}</title></head>
        <body>{{mediaBlock}}{{socialLinks}}</body>
      </html>
    `,
    video: {
      title: "Extern video",
      excerpt: "Beskrivning",
      publishedAt: "2026-03-15",
      provider: "youtube",
      embedUrl: "https://www.youtube.com/embed/example123",
      thumbnail: "/content/story-5platser-gotland.webp",
      socialLinks: {
        instagram: "https://www.instagram.com/example/",
        tiktok: null,
      },
      urlPath: "/videos/extern-video/",
    },
  });

  assert.match(html, /iframe/);
  assert.match(html, /youtube\.com\/embed\/example123/);
  assert.match(html, /Instagram/);
});
