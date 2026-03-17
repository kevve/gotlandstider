import fs from "node:fs/promises";
import path from "node:path";

import { formatValidationErrors, validateContentCollections } from "./content-validation.mjs";

export async function buildContentIndexes(rootDir = process.cwd()) {
  const validation = await validateContentCollections(rootDir);

  if (!validation.valid) {
    throw new Error(`Content validation failed:\n${formatValidationErrors(validation.errors)}`);
  }

  const articles = validation.articles
    .filter((article) => !article.data.draft)
    .map((article) => normalizeArticle(article, rootDir))
    .sort(compareByPublishedDateDesc);

  const homepage = buildHomepageContent(
    validation.articles.filter((article) => !article.data.draft && article.data.video),
    rootDir,
  );

  return {
    articles: {
      items: articles,
    },
    featured: {
      articles: articles.filter((article) => article.featured),
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
    writeJsonFile(path.join(outputDir, "featured.json"), indexes.featured),
    writeJsonFile(path.join(outputDir, "homepage.json"), indexes.homepage),
  ]);

  return indexes;
}

function normalizeArticle(article, rootDir) {
  const { video, homepage, ...data } = article.data;

  return {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    publishedAt: data.publishedAt,
    updatedAt: data.updatedAt,
    heroImage: data.heroImage,
    tags: data.tags,
    featured: data.featured,
    draft: data.draft,
    urlPath: `/articles/${data.slug}/`,
    sourceFile: toRepoRelativePath(article.filePath, rootDir),
    ...(video
      ? {
          video: {
            provider: video.provider,
            embedUrl: video.embedUrl,
            thumbnail: video.thumbnail,
            socialLinks: video.socialLinks,
            legacySources: video.legacySources,
          },
        }
      : {}),
    ...(homepage ? { homepage } : {}),
  };
}

function buildHomepageContent(articles, rootDir) {
  const normalizedVideoArticles = articles
    .map((article) => normalizeHomepageVideoArticle(article, rootDir))
    .sort(compareByPublishedDateDesc);

  const featuredSource = articles.find((article) => article.data.featured) ?? articles[0];
  const featuredVideo = featuredSource
    ? {
        ...normalizeHomepageVideoArticle(featuredSource, rootDir),
        heading: featuredSource.data.homepage?.heading ?? {
          prefix: featuredSource.data.title,
          accent: "",
        },
        description: featuredSource.data.homepage?.description ?? featuredSource.data.excerpt,
        highlights: featuredSource.data.homepage?.highlights ?? [],
      }
    : null;

  const storyArchive = normalizedVideoArticles
    .filter((article) => !article.featured)
    .map((article) => {
      const source = articles.find((entry) => entry.data.slug === article.slug);
      return {
        ...article,
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
    .map((article, index) => {
      const { homepageOrder: _homepageOrder, ...rest } = article;
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

function normalizeHomepageVideoArticle(article, rootDir) {
  return {
    title: article.data.title,
    slug: article.data.slug,
    excerpt: article.data.excerpt,
    publishedAt: article.data.publishedAt,
    thumbnail: article.data.video.thumbnail,
    provider: article.data.video.provider,
    embedUrl: article.data.video.embedUrl,
    socialLinks: article.data.video.socialLinks,
    featured: article.data.featured,
    draft: article.data.draft,
    legacySources: article.data.video.legacySources,
    urlPath: `/articles/${article.data.slug}/`,
    sourceFile: toRepoRelativePath(article.filePath, rootDir),
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
