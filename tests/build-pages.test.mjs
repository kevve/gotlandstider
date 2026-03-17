import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildArticlePages, buildPages, buildVideoPages, writeArticlePages, writePages } from "../scripts/build-pages.mjs";
import { renderVideoDetailPage } from "../scripts/lib/video-rendering.mjs";

test("buildArticlePages returns archive and detail pages for published articles", async () => {
  const result = await buildArticlePages(process.cwd());

  assert.equal(result.articles.length, 0);
  assert.equal(result.pages.length, 0);
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
    await assert.rejects(fs.access(path.join(tempDir, "articles", "index.html")));
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
  assert.match(archivePage.html, /<footer id="contact"/);
  assert.match(archivePage.html, /src="\/navscripts\.js"/);
  assert.match(archivePage.html, /href="\/videos\/" class="font-semibold text-gotland-rust transition-colors"/);
  assert.match(detailPage.html, /Lokalt videoarkiv/);
  assert.match(detailPage.html, /story-brunan-ljugarn\.mp4/);
  assert.match(detailPage.html, /<footer id="contact"/);
  assert.match(detailPage.html, /href="\/videos\/" class="font-semibold text-gotland-rust transition-colors"/);
});

test("buildPages returns both article and video routes", async () => {
  const result = await buildPages(process.cwd());

  assert.equal(result.articles.length, 0);
  assert.equal(result.videos.length, 4);
  assert.equal(result.pages.length, 5);
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
    await assert.rejects(fs.access(path.join(tempDir, "articles", "index.html")));

    const [videoArchiveHtml, videoDetailHtml] = await Promise.all([
      fs.readFile(path.join(tempDir, "videos", "index.html"), "utf8"),
      fs.readFile(path.join(tempDir, "videos", "arets-loppis-favoriter", "index.html"), "utf8"),
    ]);

    assert.match(videoArchiveHtml, /Videor från ön/);
    assert.match(videoArchiveHtml, /<footer id="contact"/);
    assert.match(videoArchiveHtml, /src="\/navscripts\.js"/);
    assert.match(videoDetailHtml, /Årets loppis-favoriter/);
    assert.match(videoDetailHtml, /story-loppisar-gotland\.webm/);
    assert.match(videoDetailHtml, /<footer id="contact"/);
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
