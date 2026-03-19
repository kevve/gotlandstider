import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  parseArticleFile,
  validateContentCollections,
} from "../scripts/lib/content-validation.mjs";

test("validateContentCollections passes for the current repo content", async () => {
  const result = await validateContentCollections(process.cwd());
  const articleFiles = (await fs.readdir(path.join(process.cwd(), "content", "articles"))).filter(
    (filename) => filename.endsWith(".md"),
  );

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.articles.length, articleFiles.length);
});

test("parseArticleFile reads nested markdown front matter", () => {
  const article = parseArticleFile(
    "content/articles/example.md",
    `---
title: Exempelartikel
slug: exempelartikel
excerpt: Kort text
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/example.webp
tags:
  - Gotland
  - Guide
featured: false
draft: true
video:
  provider: youtube
  embedUrl: https://www.youtube.com/embed/example123
  thumbnail: /content/example.webp
  socialLinks:
    instagram: https://www.instagram.com/example/
    tiktok: null
homepage:
  badge: Tips
  subtitle: Gotland • Guide
  order: 2
---

Brödtext.
`,
  );

  assert.equal(article.data.title, "Exempelartikel");
  assert.deepEqual(article.data.tags, ["Gotland", "Guide"]);
  assert.equal(article.data.featured, false);
  assert.equal(article.data.draft, true);
  assert.equal(article.data.video.provider, "youtube");
  assert.equal(article.data.homepage.order, 2);
  assert.equal(article.body, "Brödtext.");
});

test("parseArticleFile normalizes blank Decap social links to null", () => {
  const article = parseArticleFile(
    "content/articles/example.md",
    `---
title: Exempelartikel
slug: exempelartikel
excerpt: Kort text
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/example.webp
tags:
  - Gotland
featured: false
draft: true
video:
  provider: youtube
  embedUrl: https://www.youtube.com/embed/example123
  thumbnail: /content/example.webp
  socialLinks:
    instagram: ""
    tiktok: "   "
---

Brödtext.
`,
  );

  assert.equal(article.data.video.socialLinks.instagram, null);
  assert.equal(article.data.video.socialLinks.tiktok, null);
});

test("validateContentCollections reports invalid dates and duplicate article slugs", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-content-validation-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "articles"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "content"), { recursive: true });

    await Promise.all([
      fs.writeFile(path.join(tempDir, "content", "example.webp"), "image"),
      fs.writeFile(
        path.join(tempDir, "content", "articles", "first.md"),
        `---
title: Första
slug: samma-slug
excerpt: Kort text
publishedAt: 2026-14-03
updatedAt: 2026-03-15
heroImage: /content/example.webp
tags:
  - Gotland
featured: true
draft: false
---

Innehåll.
`,
      ),
      fs.writeFile(
        path.join(tempDir, "content", "articles", "second.md"),
        `---
title: Andra
slug: samma-slug
excerpt: Kort text
publishedAt: 2026-03-16
updatedAt: 2026-03-16
heroImage: /content/example.webp
tags:
  - Guide
featured: false
draft: false
---

Innehåll.
`,
      ),
    ]);

    const result = await validateContentCollections(tempDir);

    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /"publishedAt" must use YYYY-MM-DD format/);
    assert.match(result.errors.join("\n"), /duplicate slug "samma-slug"/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("validateContentCollections rejects malformed nested video metadata", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-content-validation-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "articles"), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(tempDir, "content", "video-thumb.webp"), "image"),
      fs.writeFile(
        path.join(tempDir, "content", "articles", "video.md"),
        `---
title: Videoartikel
slug: videoartikel
excerpt: Kort text
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/video-thumb.webp
tags:
  - Guide
featured: false
draft: false
video:
  provider: youtube
  embedUrl: https://www.youtube.com/watch?v=abc123
  thumbnail: /content/video-thumb.webp
  socialLinks: inte-ett-objekt
homepage:
  badge:
    - fel
---

Innehåll.
`,
      ),
    ]);

    const result = await validateContentCollections(tempDir);

    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /"video\.socialLinks" must be an object/);
    assert.match(result.errors.join("\n"), /"homepage\.badge" must be a string/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("validateContentCollections allows new external-embed video articles without legacySources", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-content-validation-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "articles"), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(tempDir, "content", "example.webp"), "image"),
      fs.writeFile(
        path.join(tempDir, "content", "articles", "article.md"),
        `---
title: Artikel med video
slug: artikel-med-video
excerpt: Kort text
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/example.webp
tags:
  - Guide
featured: false
draft: false
video:
  provider: youtube
  embedUrl: https://www.youtube.com/embed/abc123
  thumbnail: /content/example.webp
  socialLinks:
    instagram: null
    tiktok: null
---

Innehåll.
`,
      ),
    ]);

    const result = await validateContentCollections(tempDir);

    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("validateContentCollections accepts blank Decap social link fields after normalization", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-content-validation-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "articles"), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(tempDir, "content", "example.webp"), "image"),
      fs.writeFile(
        path.join(tempDir, "content", "articles", "article.md"),
        `---
title: Artikel med video
slug: artikel-med-video
excerpt: Kort text
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/example.webp
tags:
  - Guide
featured: false
draft: false
video:
  provider: youtube
  embedUrl: https://www.youtube.com/embed/abc123
  thumbnail: /content/example.webp
  socialLinks:
    instagram: ""
    tiktok: ""
---

Innehåll.
`,
      ),
    ]);

    const result = await validateContentCollections(tempDir);

    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("validateContentCollections rejects non-legacy video articles with legacySources", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-content-validation-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "articles"), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(tempDir, "content", "example.webp"), "image"),
      fs.writeFile(path.join(tempDir, "content", "legacy.webm"), "video"),
      fs.writeFile(path.join(tempDir, "content", "legacy.mp4"), "video"),
      fs.writeFile(
        path.join(tempDir, "content", "articles", "article.md"),
        `---
title: Artikel med legacy-fel
slug: artikel-med-legacy-fel
excerpt: Kort text
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/example.webp
tags:
  - Guide
featured: false
draft: false
video:
  provider: youtube
  embedUrl: https://www.youtube.com/embed/abc123
  thumbnail: /content/example.webp
  socialLinks:
    instagram: null
    tiktok: null
  legacySources:
    webm: /content/legacy.webm
    mp4: /content/legacy.mp4
---

Innehåll.
`,
      ),
    ]);

    const result = await validateContentCollections(tempDir);

    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /"video\.legacySources" is only allowed when video.provider is "legacy-local"/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("validateContentCollections rejects new legacy-local video article entries", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-content-validation-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "articles"), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(tempDir, "content", "example.webp"), "image"),
      fs.writeFile(path.join(tempDir, "content", "legacy.webm"), "video"),
      fs.writeFile(path.join(tempDir, "content", "legacy.mp4"), "video"),
      fs.writeFile(
        path.join(tempDir, "content", "articles", "article.md"),
        `---
title: Ny lokal video
slug: ny-lokal-video
excerpt: Kort text
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/example.webp
tags:
  - Guide
featured: false
draft: false
video:
  provider: legacy-local
  embedUrl: https://www.gotlandstider.se/articles/ny-lokal-video/
  thumbnail: /content/example.webp
  socialLinks:
    instagram: null
    tiktok: null
  legacySources:
    webm: /content/legacy.webm
    mp4: /content/legacy.mp4
---

Innehåll.
`,
      ),
    ]);

    const result = await validateContentCollections(tempDir);

    assert.equal(result.valid, false);
    assert.match(
      result.errors.join("\n"),
      /"video.provider: legacy-local" is reserved for existing grandfathered videos; use an external embed provider for new entries/,
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
