import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildArticlePages, writeArticlePages } from "../scripts/build-pages.mjs";

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
