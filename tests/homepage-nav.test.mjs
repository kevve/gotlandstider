import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();

test("homepage navigation matches the current shared-menu rollout", async () => {
  const homepageHtml = await fs.readFile(path.join(rootDir, "index.html"), "utf8");

  assert.match(homepageHtml, />Upplevelser</);
  assert.match(homepageHtml, />Sommarhuset</);
  assert.match(homepageHtml, />Arkivet</);
  assert.match(homepageHtml, />Kontakt</);
  assert.match(homepageHtml, /href="\/videos\/"[^>]*>Arkivet</);
  assert.doesNotMatch(homepageHtml, />Om oss</);
  assert.doesNotMatch(homepageHtml, /class="scroll-smooth"/);
  assert.match(homepageHtml, /id="stories" class="scroll-mt-24/);
  assert.match(homepageHtml, /id="house" class="scroll-mt-24/);
  assert.match(homepageHtml, /id="contact" class="scroll-mt-24/);
  assert.match(homepageHtml, /src="homevideoscripts\.js"/);
});
