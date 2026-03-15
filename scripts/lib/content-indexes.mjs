import fs from "node:fs/promises";
import path from "node:path";

import { formatValidationErrors, validateContentCollections } from "./content-validation.mjs";

export async function buildContentIndexes(rootDir = process.cwd()) {
  const validation = await validateContentCollections(rootDir);

  if (!validation.valid) {
    throw new Error(`Content validation failed:\n${formatValidationErrors(validation.errors)}`);
  }

  const articles = validation.articles
    .map((article) => normalizeArticle(article, rootDir))
    .sort(compareByPublishedDateDesc);

  const videos = validation.videos
    .map((video) => normalizeVideo(video, rootDir))
    .sort(compareByPublishedDateDesc);

  return {
    articles: {
      items: articles,
    },
    videos: {
      items: videos,
    },
    featured: {
      articles: articles.filter((article) => article.featured && !article.draft),
      videos: videos.filter((video) => video.featured),
    },
  };
}

export async function writeContentIndexes(rootDir = process.cwd()) {
  const indexes = await buildContentIndexes(rootDir);
  const outputDir = path.join(rootDir, "generated", "content");

  await fs.mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeJsonFile(path.join(outputDir, "articles.json"), indexes.articles),
    writeJsonFile(path.join(outputDir, "videos.json"), indexes.videos),
    writeJsonFile(path.join(outputDir, "featured.json"), indexes.featured),
  ]);

  return indexes;
}

function normalizeArticle(article, rootDir) {
  return {
    title: article.data.title,
    slug: article.data.slug,
    excerpt: article.data.excerpt,
    publishedAt: article.data.publishedAt,
    updatedAt: article.data.updatedAt,
    heroImage: article.data.heroImage,
    tags: article.data.tags,
    featured: article.data.featured,
    draft: article.data.draft,
    urlPath: `/articles/${article.data.slug}/`,
    sourceFile: toRepoRelativePath(article.filePath, rootDir),
  };
}

function normalizeVideo(video, rootDir) {
  return {
    title: video.data.title,
    slug: video.data.slug,
    excerpt: video.data.excerpt,
    publishedAt: video.data.publishedAt,
    thumbnail: video.data.thumbnail,
    provider: video.data.provider,
    embedUrl: video.data.embedUrl,
    socialLinks: video.data.socialLinks,
    featured: video.data.featured,
    legacySources: video.data.legacySources,
    urlPath: `/videos/${video.data.slug}/`,
    sourceFile: toRepoRelativePath(video.filePath, rootDir),
  };
}

function compareByPublishedDateDesc(left, right) {
  if (left.publishedAt === right.publishedAt) {
    return left.slug.localeCompare(right.slug);
  }

  return right.publishedAt.localeCompare(left.publishedAt);
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function toRepoRelativePath(filePath, rootDir) {
  return path.relative(rootDir, filePath);
}
