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

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.articles.length, 2);
  assert.equal(result.videos.length, 4);
});

test("parseArticleFile reads the current markdown front matter shape", () => {
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
---

Brödtext.
`,
  );

  assert.equal(article.data.title, "Exempelartikel");
  assert.deepEqual(article.data.tags, ["Gotland", "Guide"]);
  assert.equal(article.data.featured, false);
  assert.equal(article.data.draft, true);
  assert.equal(article.body, "Brödtext.");
});

test("validateContentCollections reports invalid dates and duplicate article slugs", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-content-validation-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "articles"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "content", "videos"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "content"), { recursive: true });

    await Promise.all([
      fs.writeFile(path.join(tempDir, "content", "example.webp"), "image"),
      fs.writeFile(path.join(tempDir, "content", "video-thumb.webp"), "image"),
      fs.writeFile(path.join(tempDir, "content", "legacy.webm"), "video"),
      fs.writeFile(path.join(tempDir, "content", "legacy.mp4"), "video"),
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
      fs.writeFile(
        path.join(tempDir, "content", "videos", "video.json"),
        JSON.stringify(
          {
            title: "Video",
            slug: "video",
            excerpt: "Kort text",
            publishedAt: "2026-03-15",
            thumbnail: "/content/video-thumb.webp",
            provider: "legacy-local",
            embedUrl: "https://www.gotlandstider.se/video",
            socialLinks: {
              instagram: null,
              tiktok: "https://www.tiktok.com/example",
            },
            featured: false,
            legacySources: {
              webm: "/content/legacy.webm",
              mp4: "/content/legacy.mp4",
            },
          },
          null,
          2,
        ),
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

test("validateContentCollections rejects malformed legacy video definitions", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-content-validation-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "articles"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "content", "videos"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "content", "video-thumb.webp"), "image");
    await fs.writeFile(
      path.join(tempDir, "content", "articles", "article.md"),
      `---
title: Artikel
slug: artikel
excerpt: Kort text
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/video-thumb.webp
tags:
  - Guide
featured: false
draft: false
---

Innehåll.
`,
    );
    await fs.writeFile(
      path.join(tempDir, "content", "videos", "video.json"),
      JSON.stringify(
        {
          title: "Video",
          slug: "video",
          excerpt: "Kort text",
          publishedAt: "2026-03-15",
          thumbnail: "/content/video-thumb.webp",
          provider: "youtube",
          embedUrl: "https://www.youtube.com/watch?v=abc123",
          socialLinks: {
            instagram: "https://www.instagram.com/example/",
          },
          featured: true,
          legacySources: {
            webm: "/content/missing.webm",
            mp4: "/content/missing.mp4",
          },
        },
        null,
        2,
      ),
    );

    const result = await validateContentCollections(tempDir);

    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /"legacySources" is only allowed when provider is "legacy-local"/);
    assert.match(result.errors.join("\n"), /legacy source "webm" points to a missing file/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("validateContentCollections allows new external-embed videos without legacySources", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-content-validation-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "articles"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "content", "videos"), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(tempDir, "content", "example.webp"), "image"),
      fs.writeFile(path.join(tempDir, "content", "video-thumb.webp"), "image"),
      fs.writeFile(
        path.join(tempDir, "content", "articles", "article.md"),
        `---
title: Artikel
slug: artikel
excerpt: Kort text
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/example.webp
tags:
  - Guide
featured: false
draft: false
---

Innehåll.
`,
      ),
      fs.writeFile(
        path.join(tempDir, "content", "videos", "video.json"),
        JSON.stringify(
          {
            title: "Ny video",
            slug: "ny-video-med-embed",
            excerpt: "Kort text",
            publishedAt: "2026-03-15",
            thumbnail: "/content/video-thumb.webp",
            provider: "youtube",
            embedUrl: "https://www.youtube.com/watch?v=abc123",
            socialLinks: {
              instagram: null,
              tiktok: null,
            },
            featured: false,
          },
          null,
          2,
        ),
      ),
    ]);

    const result = await validateContentCollections(tempDir);

    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("validateContentCollections rejects new legacy-local video entries", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gotlandstider-content-validation-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "articles"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "content", "videos"), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(tempDir, "content", "example.webp"), "image"),
      fs.writeFile(path.join(tempDir, "content", "video-thumb.webp"), "image"),
      fs.writeFile(path.join(tempDir, "content", "legacy.webm"), "video"),
      fs.writeFile(path.join(tempDir, "content", "legacy.mp4"), "video"),
      fs.writeFile(
        path.join(tempDir, "content", "articles", "article.md"),
        `---
title: Artikel
slug: artikel
excerpt: Kort text
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/example.webp
tags:
  - Guide
featured: false
draft: false
---

Innehåll.
`,
      ),
      fs.writeFile(
        path.join(tempDir, "content", "videos", "video.json"),
        JSON.stringify(
          {
            title: "Ny lokal video",
            slug: "ny-lokal-video",
            excerpt: "Kort text",
            publishedAt: "2026-03-15",
            thumbnail: "/content/video-thumb.webp",
            provider: "legacy-local",
            embedUrl: "https://www.gotlandstider.se/videos/ny-lokal-video/",
            socialLinks: {
              instagram: null,
              tiktok: null,
            },
            featured: false,
            legacySources: {
              webm: "/content/legacy.webm",
              mp4: "/content/legacy.mp4",
            },
          },
          null,
          2,
        ),
      ),
    ]);

    const result = await validateContentCollections(tempDir);

    assert.equal(result.valid, false);
    assert.match(
      result.errors.join("\n"),
      /"legacy-local" is reserved for existing grandfathered videos; use an external embed provider for new entries/,
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
