import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildContentIndexes, writeContentIndexes } from "../scripts/lib/content-indexes.mjs";

test("buildContentIndexes returns stable collections from the current repo content", async () => {
  const indexes = await buildContentIndexes(process.cwd());

  assert.equal(indexes.articles.items.length, 2);
  assert.equal(indexes.videos.items.length, 4);
  assert.equal(indexes.featured.articles.length, 1);
  assert.equal(indexes.featured.videos.length, 1);
  assert.equal(indexes.homepage.storyArchive.length, 3);
  assert.equal(indexes.articles.items[0].slug, "projekt-ljugarn-fran-tomt-till-sommarhus");
  assert.equal(indexes.videos.items[0].slug, "arets-loppis-favoriter");
  assert.equal(indexes.featured.videos[0].slug, "fem-platser-att-besoka-pa-gotland-2026");
  assert.equal(indexes.homepage.featuredVideo.slug, "fem-platser-att-besoka-pa-gotland-2026");
  assert.deepEqual(
    indexes.homepage.storyArchive.map((story) => story.slug),
    [
      "arets-loppis-favoriter",
      "musikquiz-och-god-mat-vid-stranden",
      "en-strand-for-stora-och-sma",
    ],
  );
});

test("writeContentIndexes writes deterministic JSON files", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-build-content-"));

  try {
    await fs.cp(path.join(process.cwd(), "content"), path.join(tempDir, "content"), {
      recursive: true,
    });

    const firstRun = await writeContentIndexes(tempDir);
    const secondRun = await writeContentIndexes(tempDir);

    assert.deepEqual(secondRun, firstRun);

    const [articlesJson, videosJson, featuredJson, homepageJson] = await Promise.all([
      fs.readFile(path.join(tempDir, "generated", "content", "articles.json"), "utf8"),
      fs.readFile(path.join(tempDir, "generated", "content", "videos.json"), "utf8"),
      fs.readFile(path.join(tempDir, "generated", "content", "featured.json"), "utf8"),
      fs.readFile(path.join(tempDir, "generated", "content", "homepage.json"), "utf8"),
    ]);

    assert.match(articlesJson, /"slug": "projekt-ljugarn-fran-tomt-till-sommarhus"/);
    assert.match(videosJson, /"slug": "arets-loppis-favoriter"/);
    assert.match(featuredJson, /"slug": "fem-platser-att-besoka-pa-gotland-2026"/);
    assert.match(homepageJson, /"storyArchive"/);
    assert.match(homepageJson, /"subtitle": "Gotland • Inredning"/);
    assert.match(homepageJson, /"slug": "musikquiz-och-god-mat-vid-stranden"/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
