#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { loadContentCollections } from "./lib/content-validation.mjs";
import { buildContentIndexes } from "./lib/content-indexes.mjs";
import {
  loadTemplate,
  renderArticleArchivePage,
  renderArticleDetailPage,
  toArticlePageModel,
} from "./lib/article-rendering.mjs";

export async function buildArticlePages(rootDir = process.cwd()) {
  const { articles } = await loadContentCollections(rootDir);
  const indexes = await buildContentIndexes(rootDir);
  const archiveTemplate = await loadTemplate(rootDir, "article-archive.html");
  const detailTemplate = await loadTemplate(rootDir, "article-detail.html");

  const publishedArticles = articles
    .map((article) => toArticlePageModel(article))
    .filter((article) => !article.draft)
    .sort((left, right) => indexes.articles.items.findIndex((item) => item.slug === left.slug) - indexes.articles.items.findIndex((item) => item.slug === right.slug));

  const pages = [
    {
      outputPath: path.join(rootDir, "articles", "index.html"),
      html: renderArticleArchivePage({
        template: archiveTemplate,
        articles: publishedArticles,
      }),
    },
    ...publishedArticles.map((article) => ({
      outputPath: path.join(rootDir, "articles", article.slug, "index.html"),
      html: renderArticleDetailPage({
        template: detailTemplate,
        article,
      }),
    })),
  ];

  return {
    articles: publishedArticles,
    pages,
  };
}

export async function writeArticlePages(rootDir = process.cwd()) {
  const result = await buildArticlePages(rootDir);
  const articlesDir = path.join(rootDir, "articles");

  await fs.rm(articlesDir, { recursive: true, force: true });

  for (const page of result.pages) {
    await fs.mkdir(path.dirname(page.outputPath), { recursive: true });
    await fs.writeFile(page.outputPath, `${page.html.trim()}\n`, "utf8");
  }

  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await writeArticlePages(process.cwd());
  console.log(`Generated ${result.pages.length} article page(s) from ${result.articles.length} published article(s).`);
}
