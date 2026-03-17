#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { loadContentCollections } from "./lib/content-validation.mjs";
import { buildContentIndexes } from "./lib/content-indexes.mjs";
import {
  loadPageTemplateBundle,
  renderArticleArchivePage,
  renderArticleDetailPage,
  toArticlePageModel,
} from "./lib/article-rendering.mjs";
import {
  loadVideoTemplateBundle,
  renderVideoArchivePage,
  renderVideoDetailPage,
  toVideoPageModel,
} from "./lib/video-rendering.mjs";

export async function buildArticlePages(rootDir = process.cwd()) {
  const { articles } = await loadContentCollections(rootDir);
  const indexes = await buildContentIndexes(rootDir);
  const [{ template: archiveTemplate, shell }, { template: detailTemplate }] = await Promise.all([
    loadPageTemplateBundle(rootDir, "article-archive.html"),
    loadPageTemplateBundle(rootDir, "article-detail.html"),
  ]);

  const publishedArticles = articles
    .map((article) => toArticlePageModel(article))
    .filter((article) => !article.draft)
    .sort((left, right) => indexes.articles.items.findIndex((item) => item.slug === left.slug) - indexes.articles.items.findIndex((item) => item.slug === right.slug));

  const pages = [
    ...(publishedArticles.length > 0
      ? [
          {
            outputPath: path.join(rootDir, "articles", "index.html"),
            html: renderArticleArchivePage({
              template: archiveTemplate,
              articles: publishedArticles,
              shell,
            }),
          },
        ]
      : []),
    ...publishedArticles.map((article) => ({
      outputPath: path.join(rootDir, "articles", article.slug, "index.html"),
      html: renderArticleDetailPage({
        template: detailTemplate,
        article,
        shell,
      }),
    })),
  ];

  return {
    articles: publishedArticles,
    pages,
  };
}

export async function buildVideoPages(rootDir = process.cwd()) {
  const { videos } = await loadContentCollections(rootDir);
  const indexes = await buildContentIndexes(rootDir);
  const [{ template: archiveTemplate, shell }, { template: detailTemplate }] = await Promise.all([
    loadVideoTemplateBundle(rootDir, "video-archive.html"),
    loadVideoTemplateBundle(rootDir, "video-detail.html"),
  ]);

  const publishedVideos = videos
    .map((video) => toVideoPageModel(video))
    .filter((video) => !video.draft)
    .sort(
      (left, right) =>
        indexes.videos.items.findIndex((item) => item.slug === left.slug) -
        indexes.videos.items.findIndex((item) => item.slug === right.slug),
    );

  const pages = [
    ...(publishedVideos.length > 0
      ? [
          {
            outputPath: path.join(rootDir, "videos", "index.html"),
            html: renderVideoArchivePage({
              template: archiveTemplate,
              videos: publishedVideos,
              shell,
            }),
          },
        ]
      : []),
    ...publishedVideos.map((video) => ({
      outputPath: path.join(rootDir, "videos", video.slug, "index.html"),
      html: renderVideoDetailPage({
        template: detailTemplate,
        video,
        shell,
      }),
    })),
  ];

  return {
    videos: publishedVideos,
    pages,
  };
}

export async function buildPages(rootDir = process.cwd()) {
  const [articleResult, videoResult] = await Promise.all([
    buildArticlePages(rootDir),
    buildVideoPages(rootDir),
  ]);

  return {
    articles: articleResult.articles,
    videos: videoResult.videos,
    pages: [...articleResult.pages, ...videoResult.pages],
  };
}

export async function writePages(rootDir = process.cwd()) {
  const result = await buildPages(rootDir);

  await Promise.all([
    fs.rm(path.join(rootDir, "articles"), { recursive: true, force: true }),
    fs.rm(path.join(rootDir, "videos"), { recursive: true, force: true }),
  ]);

  for (const page of result.pages) {
    await fs.mkdir(path.dirname(page.outputPath), { recursive: true });
    await fs.writeFile(page.outputPath, `${page.html.trim()}\n`, "utf8");
  }

  return result;
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
  const result = await writePages(process.cwd());
  console.log(
    `Generated ${result.pages.length} page(s) from ${result.articles.length} published article(s) and ${result.videos.length} video entr${
      result.videos.length === 1 ? "y" : "ies"
    }.`,
  );
}
