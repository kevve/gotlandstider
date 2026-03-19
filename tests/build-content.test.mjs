import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildContentIndexes, writeContentIndexes } from "../scripts/lib/content-indexes.mjs";
import { validateContentCollections } from "../scripts/lib/content-validation.mjs";

test("buildContentIndexes returns stable article collections from the current repo content", async () => {
  const indexes = await buildContentIndexes(process.cwd());
  const validation = await validateContentCollections(process.cwd());
  const publishedArticles = validation.articles
    .filter((article) => !article.data.draft)
    .sort(compareByPublishedDateDesc);
  const featuredArticles = publishedArticles.filter((article) => article.data.featured);
  const videoArticles = publishedArticles.filter((article) => article.data.video);
  const featuredVideoSource = videoArticles.find((article) => article.data.featured) ?? videoArticles[0] ?? null;
  const expectedStoryArchive = videoArticles
    .filter((article) => !article.data.featured)
    .sort(compareHomepageStoryArchiveOrder)
    .slice(0, 3)
    .map((article) => article.data.slug);

  assert.equal(indexes.articles.items.length, publishedArticles.length);
  assert.equal(indexes.featured.articles.length, featuredArticles.length);
  assert.equal(indexes.homepage.storyArchive.length, expectedStoryArchive.length);
  assert.equal(indexes.articles.items[0].slug, publishedArticles[0].data.slug);
  assert.equal(indexes.featured.articles[0].slug, featuredArticles[0].data.slug);
  assert.equal(indexes.homepage.featuredVideo.slug, featuredVideoSource.data.slug);
  assert.deepEqual(indexes.homepage.storyArchive.map((story) => story.slug), expectedStoryArchive);
  assert.equal(indexes.articles.items[0].urlPath, `/articles/${publishedArticles[0].data.slug}/`);
  assert.equal(indexes.featured.articles[0].video.provider, featuredArticles[0].data.video.provider);
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

    const [articlesJson, featuredJson, homepageJson] = await Promise.all([
      fs.readFile(path.join(tempDir, "generated", "content", "articles.json"), "utf8"),
      fs.readFile(path.join(tempDir, "generated", "content", "featured.json"), "utf8"),
      fs.readFile(path.join(tempDir, "generated", "content", "homepage.json"), "utf8"),
    ]);

    assert.match(articlesJson, /"slug": "arets-loppis-favoriter"/);
    assert.match(articlesJson, /"video": \{/);
    assert.match(featuredJson, /"slug": "fem-platser-att-besoka-pa-gotland-2026"/);
    assert.doesNotMatch(featuredJson, /projekt-ljugarn-fran-tomt-till-sommarhus/);
    assert.match(homepageJson, /"storyArchive"/);
    assert.match(homepageJson, /"subtitle": "Gotland • Inredning"/);
    assert.match(homepageJson, /"urlPath": "\/articles\/musikquiz-och-god-mat-vid-stranden\/"/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

function compareByPublishedDateDesc(left, right) {
  if (left.data.publishedAt === right.data.publishedAt) {
    return left.data.slug.localeCompare(right.data.slug);
  }

  return right.data.publishedAt.localeCompare(left.data.publishedAt);
}

function compareHomepageStoryArchiveOrder(left, right) {
  const leftOrder = left.data.homepage?.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.data.homepage?.order ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder === rightOrder) {
    return compareByPublishedDateDesc(left, right);
  }

  return leftOrder - rightOrder;
}
