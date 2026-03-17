import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { writeHomepageShell } from "../scripts/build-homepage-shell.mjs";

const rootDir = process.cwd();

test("writeHomepageShell keeps the homepage header and footer in sync with the shared shell", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-homepage-shell-"));

  try {
    await Promise.all([
      fs.copyFile(path.join(rootDir, "index.html"), path.join(tempDir, "index.html")),
      fs.cp(path.join(rootDir, "templates"), path.join(tempDir, "templates"), { recursive: true }),
    ]);

    const firstRun = await writeHomepageShell(tempDir);
    const secondRun = await writeHomepageShell(tempDir);
    const homepageHtml = await fs.readFile(path.join(tempDir, "index.html"), "utf8");

    assert.equal(secondRun.header, firstRun.header);
    assert.equal(secondRun.footer, firstRun.footer);
    assert.match(homepageHtml, /GENERATED_SITE_HEADER_START/);
    assert.match(homepageHtml, /GENERATED_SITE_FOOTER_START/);
    assert.match(homepageHtml, /href="#stories" class="hover:text-gotland-rust transition-colors">Upplevelser</);
    assert.match(homepageHtml, /href="#house" class="hover:text-gotland-rust transition-colors">Sommarhuset</);
    assert.match(homepageHtml, /href="\/videos\/" class="hover:text-gotland-rust transition-colors">Arkivet</);
    assert.match(homepageHtml, /cdn-cgi\/l\/email-protection/);
    assert.match(homepageHtml, /__cf_email__/);
    assert.match(homepageHtml, /email-decode\.min\.js/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
