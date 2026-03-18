import fs from "node:fs/promises";
import path from "node:path";

import { buildContentIndexes } from "./content-indexes.mjs";

const SITE_URL = "https://www.gotlandstider.se";
const STRUCTURED_DATA_START = "<!-- GENERATED_HOMEPAGE_STRUCTURED_DATA_START -->";
const STRUCTURED_DATA_END = "<!-- GENERATED_HOMEPAGE_STRUCTURED_DATA_END -->";

const HOMEPAGE_IMAGE_ENTRIES = [
  {
    loc: `${SITE_URL}/content/hero-coastline.webp`,
    title: "Gotlandstider vid Langhammars raukfält på Fårö",
  },
  {
    loc: `${SITE_URL}/content/about-kevinhenrik.webp`,
    title: "Grundarna Kevin och Henrik",
  },
];

const ORGANIZATION_SCHEMA = {
  "@type": "Organization",
  name: "Gotlandstider",
  alternateName: "Gotlandstider - Din guide till det gotländska ö-livet",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon-v2.svg`,
  image: `${SITE_URL}/content/hero-coastline.webp`,
  email: "info@gotlandstider.se",
  description: "Upptäck Gotlands dolda pärlor och följ resan mot ett arkitektritat sommarhus i Ljugarn. Året runt.",
  knowsAbout: [
    "Gotland Restips",
    "Gotländska Entreprenörer",
    "Husbygge & Arkitektur",
    "Hem & Hus",
    "Inredning & Design",
    "Loppis",
    "Gotland",
    "Ljugarn",
    "Content Production",
  ],
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Gotlands län",
  },
  founders: [
    {
      "@type": "Person",
      name: "Kevin",
    },
    {
      "@type": "Person",
      name: "Henrik",
    },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ljugarn",
    addressRegion: "Gotland",
    postalCode: "623 65",
    addressCountry: "SE",
  },
  sameAs: [
    "https://www.instagram.com/gotlandstider/",
    "https://www.tiktok.com/@gotlandstider",
  ],
};

export async function buildSeoOutputs(rootDir = process.cwd()) {
  const indexes = await buildContentIndexes(rootDir);
  const homepageArticles = [
    indexes.homepage.featuredVideo,
    ...indexes.homepage.storyArchive,
  ].filter(Boolean);

  const structuredData = buildHomepageStructuredData(homepageArticles);
  const indexHtmlPath = path.join(rootDir, "index.html");
  const currentIndexHtml = await fs.readFile(indexHtmlPath, "utf8");

  return {
    sitemapXml: buildSitemapXml(indexes.articles.items),
    indexHtml: replaceStructuredDataBlock(currentIndexHtml, structuredData),
    structuredData,
  };
}

export async function writeSeoOutputs(rootDir = process.cwd()) {
  const outputs = await buildSeoOutputs(rootDir);

  await Promise.all([
    fs.writeFile(path.join(rootDir, "sitemap.xml"), outputs.sitemapXml, "utf8"),
    fs.writeFile(path.join(rootDir, "index.html"), outputs.indexHtml, "utf8"),
  ]);

  return outputs;
}

export function buildHomepageStructuredData(articles) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      ORGANIZATION_SCHEMA,
      ...articles.map((article) => buildVideoStructuredData(article)),
    ],
  };
}

export function buildSitemapXml(articles) {
  const latestArticleDate = articles.reduce(
    (latest, article) => (article.publishedAt > latest ? article.publishedAt : latest),
    "2026-01-01",
  );

  const entries = [
    renderUrlEntry({
      loc: `${SITE_URL}/`,
      lastmod: latestArticleDate,
      priority: "1.0",
      changefreq: "weekly",
      images: HOMEPAGE_IMAGE_ENTRIES,
    }),
    renderUrlEntry({
      loc: `${SITE_URL}/articles/`,
      lastmod: latestArticleDate,
      priority: "0.8",
      changefreq: "weekly",
    }),
    ...articles.map((article) =>
      renderUrlEntry({
        loc: toAbsoluteUrl(article.urlPath),
        lastmod: article.publishedAt,
        priority: "0.7",
        changefreq: "monthly",
        video: article.video ? toSitemapVideo(article) : null,
      }),
    ),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    "",
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

function buildVideoStructuredData(article) {
  const data = {
    "@type": "VideoObject",
    name: article.title,
    description: article.excerpt,
    thumbnailUrl: toAbsoluteUrl(article.thumbnail),
    uploadDate: `${article.publishedAt}T00:00:00+00:00`,
    embedUrl: article.provider === "legacy-local" ? toAbsoluteUrl(article.urlPath) : article.embedUrl,
  };

  if (article.legacySources?.webm) {
    data.contentUrl = toAbsoluteUrl(article.legacySources.webm);
  }

  return data;
}

function toSitemapVideo(article) {
  return {
    title: article.title,
    excerpt: article.excerpt,
    publishedAt: article.publishedAt,
    thumbnail: article.video.thumbnail,
    embedUrl: article.video.embedUrl,
    provider: article.video.provider,
    legacySources: article.video.legacySources,
    urlPath: article.urlPath,
  };
}

function replaceStructuredDataBlock(indexHtml, structuredData) {
  const startIndex = indexHtml.indexOf(STRUCTURED_DATA_START);
  const endIndex = indexHtml.indexOf(STRUCTURED_DATA_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("index.html is missing generated homepage structured data markers");
  }

  const scriptBlock = [
    '    <script type="application/ld+json">',
    JSON.stringify(structuredData, null, 2)
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n"),
    "    </script>",
  ].join("\n");

  const before = indexHtml.slice(0, startIndex + STRUCTURED_DATA_START.length);
  const after = indexHtml.slice(endIndex);

  return `${before}\n${scriptBlock}\n${after}`;
}

function renderUrlEntry({ loc, lastmod, priority, changefreq, images = [], video = null }) {
  const lines = [
    "   <url>",
    `      <loc>${xmlEscape(loc)}</loc>`,
    `      <lastmod>${xmlEscape(lastmod)}</lastmod>`,
    `      <changefreq>${changefreq}</changefreq>`,
    `      <priority>${priority}</priority>`,
  ];

  for (const image of images) {
    lines.push("      <image:image>");
    lines.push(`         <image:loc>${xmlEscape(image.loc)}</image:loc>`);
    lines.push(`         <image:title>${xmlEscape(image.title)}</image:title>`);
    lines.push("      </image:image>");
  }

  if (video) {
    lines.push("      <video:video>");
    lines.push(`         <video:thumbnail_loc>${xmlEscape(toAbsoluteUrl(video.thumbnail))}</video:thumbnail_loc>`);
    lines.push(`         <video:title>${xmlEscape(video.title)}</video:title>`);
    lines.push(`         <video:description>${xmlEscape(video.excerpt)}</video:description>`);

    if (video.legacySources?.webm) {
      lines.push(`         <video:content_loc>${xmlEscape(toAbsoluteUrl(video.legacySources.webm))}</video:content_loc>`);
    } else {
      lines.push(`         <video:player_loc allow_embed="yes">${xmlEscape(video.embedUrl)}</video:player_loc>`);
    }

    lines.push(`         <video:publication_date>${xmlEscape(`${video.publishedAt}T00:00:00+00:00`)}</video:publication_date>`);
    lines.push("         <video:family_friendly>yes</video:family_friendly>");
    lines.push("         <video:live>no</video:live>");
    lines.push("      </video:video>");
  }

  lines.push("   </url>");
  return lines.join("\n");
}

function toAbsoluteUrl(pathOrUrl) {
  if (pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, SITE_URL).toString();
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
