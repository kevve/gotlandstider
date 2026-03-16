import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildSeoOutputs, writeSeoOutputs } from "../scripts/lib/seo-generation.mjs";

const STRUCTURED_DATA_START = "<!-- GENERATED_HOMEPAGE_STRUCTURED_DATA_START -->";
const STRUCTURED_DATA_END = "<!-- GENERATED_HOMEPAGE_STRUCTURED_DATA_END -->";

const INDEX_TEMPLATE = `<!DOCTYPE html>
<html lang="sv">
<head>
    ${STRUCTURED_DATA_START}
    <script type="application/ld+json">{}</script>
    ${STRUCTURED_DATA_END}
</head>
<body></body>
</html>
`;

test("buildSeoOutputs excludes draft article routes from public SEO output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-build-seo-"));

  try {
    await fs.cp(path.join(process.cwd(), "content"), path.join(tempDir, "content"), {
      recursive: true,
    });
    await fs.writeFile(path.join(tempDir, "index.html"), INDEX_TEMPLATE, "utf8");

    const outputs = await buildSeoOutputs(tempDir);

    assert.match(outputs.sitemapXml, /https:\/\/www\.gotlandstider\.se\/videos\//);
    assert.doesNotMatch(outputs.sitemapXml, /https:\/\/www\.gotlandstider\.se\/articles\//);
    assert.match(outputs.indexHtml, /"@type": "VideoObject"/);
    assert.doesNotMatch(outputs.indexHtml, /projekt-ljugarn-fran-tomt-till-sommarhus/);
    assert.doesNotMatch(outputs.indexHtml, /\/articles\//);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("writeSeoOutputs writes deterministic sitemap and structured data", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-build-seo-"));

  try {
    await fs.cp(path.join(process.cwd(), "content"), path.join(tempDir, "content"), {
      recursive: true,
    });
    await fs.writeFile(path.join(tempDir, "index.html"), INDEX_TEMPLATE, "utf8");

    const firstRun = await writeSeoOutputs(tempDir);
    const secondRun = await writeSeoOutputs(tempDir);

    assert.deepEqual(secondRun, firstRun);

    const [sitemapXml, indexHtml] = await Promise.all([
      fs.readFile(path.join(tempDir, "sitemap.xml"), "utf8"),
      fs.readFile(path.join(tempDir, "index.html"), "utf8"),
    ]);

    assert.match(sitemapXml, /<loc>https:\/\/www\.gotlandstider\.se\/videos\/<\/loc>/);
    assert.match(sitemapXml, /<loc>https:\/\/www\.gotlandstider\.se\/videos\/arets-loppis-favoriter\/<\/loc>/);
    assert.doesNotMatch(sitemapXml, /articles/);
    assert.match(indexHtml, /GENERATED_HOMEPAGE_STRUCTURED_DATA_START/);
    assert.match(indexHtml, /"name": "Årets loppis-favoriter"/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
