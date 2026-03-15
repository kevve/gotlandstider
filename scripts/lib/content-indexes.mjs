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

  const homepage = buildHomepageContent(validation.videos, rootDir);

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
    homepage,
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
    writeJsonFile(path.join(outputDir, "homepage.json"), indexes.homepage),
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

function buildHomepageContent(videos, rootDir) {
  const normalizedVideos = videos
    .map((video) => normalizeVideo(video, rootDir))
    .sort(compareByPublishedDateDesc);

  const featuredSource = videos.find((video) => video.data.featured) ?? videos[0];
  const featuredVideo = featuredSource
    ? {
        ...normalizeVideo(featuredSource, rootDir),
        heading: featuredSource.data.homepage?.heading ?? {
          prefix: featuredSource.data.title,
          accent: "",
        },
        description: featuredSource.data.homepage?.description ?? featuredSource.data.excerpt,
        highlights: featuredSource.data.homepage?.highlights ?? [],
      }
    : null;

  const storyArchive = normalizedVideos
    .filter((video) => !video.featured)
    .map((video) => {
      const source = videos.find((entry) => entry.data.slug === video.slug);
      return {
        ...video,
        homepageOrder: source?.data.homepage?.order ?? Number.MAX_SAFE_INTEGER,
        subtitle: source?.data.homepage?.subtitle ?? "",
        badge: source?.data.homepage?.badge ?? "Video",
      };
    })
    .sort((left, right) => {
      if (left.homepageOrder === right.homepageOrder) {
        return compareByPublishedDateDesc(left, right);
      }

      return left.homepageOrder - right.homepageOrder;
    })
    .slice(0, 3)
    .map((video, index) => {
      const { homepageOrder: _homepageOrder, ...rest } = video;
      return {
        id: index + 1,
        ...rest,
      };
    });

  return {
    featuredVideo,
    storyArchive,
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
