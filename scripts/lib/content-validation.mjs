import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ARTICLE_REQUIRED_FIELDS = [
  "title",
  "slug",
  "excerpt",
  "publishedAt",
  "updatedAt",
  "heroImage",
  "tags",
  "featured",
  "draft",
];

const VIDEO_REQUIRED_FIELDS = [
  "title",
  "slug",
  "excerpt",
  "publishedAt",
  "thumbnail",
  "provider",
  "embedUrl",
  "socialLinks",
  "featured",
  "draft",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LEGACY_VIDEO_SLUG_ALLOWLIST = new Set([
  "fem-platser-att-besoka-pa-gotland-2026",
  "arets-loppis-favoriter",
  "musikquiz-och-god-mat-vid-stranden",
  "en-strand-for-stora-och-sma",
]);

export async function loadContentCollections(rootDir = process.cwd()) {
  const articlesDir = path.join(rootDir, "content", "articles");
  const videosDir = path.join(rootDir, "content", "videos");

  const [articleEntries, videoEntries] = await Promise.all([
    readContentFiles(articlesDir, ".md"),
    readContentFiles(videosDir, ".json"),
  ]);

  const articles = await Promise.all(
    articleEntries.map(async (entry) => {
      const raw = await fs.readFile(entry.absolutePath, "utf8");
      return parseArticleFile(entry.absolutePath, raw);
    }),
  );

  const videos = await Promise.all(
    videoEntries.map(async (entry) => {
      const raw = await fs.readFile(entry.absolutePath, "utf8");
      return parseVideoFile(entry.absolutePath, raw);
    }),
  );

  return { articles, videos };
}

export async function validateContentCollections(rootDir = process.cwd()) {
  const { articles, videos } = await loadContentCollections(rootDir);
  const errors = [
    ...validateArticles(articles, rootDir),
    ...validateVideos(videos, rootDir),
  ];

  return {
    articles,
    videos,
    errors,
    valid: errors.length === 0,
  };
}

export function formatValidationErrors(errors) {
  return errors.map((error) => `- ${error}`).join("\n");
}

export function parseArticleFile(filePath, raw) {
  const { frontMatter, body } = parseFrontMatter(filePath, raw);

  return {
    filePath,
    filename: path.basename(filePath),
    stem: path.basename(filePath, path.extname(filePath)),
    body,
    data: frontMatter,
  };
}

export function parseVideoFile(filePath, raw) {
  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${relativePath(filePath)}: invalid JSON (${error.message})`);
  }

  return {
    filePath,
    filename: path.basename(filePath),
    stem: path.basename(filePath, path.extname(filePath)),
    data,
  };
}

function validateArticles(articles, rootDir) {
  const errors = [];
  const slugMap = new Map();

  for (const article of articles) {
    for (const field of ARTICLE_REQUIRED_FIELDS) {
      if (!(field in article.data)) {
        errors.push(`${relativePath(article.filePath)}: missing required field "${field}"`);
      }
    }

    validateCommonContentFields({
      entry: article,
      errors,
      dateFields: ["publishedAt", "updatedAt"],
      assetFields: ["heroImage"],
      rootDir,
    });

    if ("tags" in article.data) {
      if (!Array.isArray(article.data.tags) || article.data.tags.length === 0) {
        errors.push(`${relativePath(article.filePath)}: "tags" must be a non-empty array`);
      } else if (!article.data.tags.every((tag) => typeof tag === "string" && tag.trim() !== "")) {
        errors.push(`${relativePath(article.filePath)}: "tags" must contain non-empty strings`);
      }
    }

    validateBooleanField(article, "featured", errors);
    validateBooleanField(article, "draft", errors);
    trackDuplicateSlug(article, slugMap, errors);
  }

  return errors;
}

function validateVideos(videos, rootDir) {
  const errors = [];
  const slugMap = new Map();

  for (const video of videos) {
    for (const field of VIDEO_REQUIRED_FIELDS) {
      if (!(field in video.data)) {
        errors.push(`${relativePath(video.filePath)}: missing required field "${field}"`);
      }
    }

    validateCommonContentFields({
      entry: video,
      errors,
      dateFields: ["publishedAt"],
      assetFields: ["thumbnail"],
      rootDir,
    });

    validateBooleanField(video, "featured", errors);
    validateBooleanField(video, "draft", errors);

    if ("provider" in video.data && typeof video.data.provider !== "string") {
      errors.push(`${relativePath(video.filePath)}: "provider" must be a string`);
    }

    if ("embedUrl" in video.data && !isOptionalUrl(video.data.embedUrl)) {
      errors.push(`${relativePath(video.filePath)}: "embedUrl" must be an https URL`);
    }

    if ("socialLinks" in video.data) {
      const socialLinks = video.data.socialLinks;
      if (!isPlainObject(socialLinks)) {
        errors.push(`${relativePath(video.filePath)}: "socialLinks" must be an object`);
      } else {
        for (const [key, value] of Object.entries(socialLinks)) {
          if (value !== null && !isHttpsUrl(value)) {
            errors.push(`${relativePath(video.filePath)}: social link "${key}" must be null or an https URL`);
          }
        }
      }
    }

    if (video.data.provider === "legacy-local") {
      validateGrandfatheredLegacyVideo(video, errors);
      validateLegacySources(video, errors, rootDir);
    } else if ("legacySources" in video.data) {
      validateLegacySources(video, errors, rootDir);
    }

    trackDuplicateSlug(video, slugMap, errors);
  }

  return errors;
}

function validateCommonContentFields({ entry, errors, dateFields, assetFields, rootDir }) {
  for (const field of ["title", "slug", "excerpt"]) {
    if (field in entry.data && typeof entry.data[field] !== "string") {
      errors.push(`${relativePath(entry.filePath)}: "${field}" must be a string`);
    } else if (typeof entry.data[field] === "string" && entry.data[field].trim() === "") {
      errors.push(`${relativePath(entry.filePath)}: "${field}" must not be empty`);
    }
  }

  if ("slug" in entry.data && typeof entry.data.slug === "string" && !SLUG_PATTERN.test(entry.data.slug)) {
    errors.push(`${relativePath(entry.filePath)}: "slug" must use lowercase letters, numbers, and hyphens only`);
  }

  for (const field of dateFields) {
    if (field in entry.data && !isValidDateString(entry.data[field])) {
      errors.push(`${relativePath(entry.filePath)}: "${field}" must use YYYY-MM-DD format`);
    }
  }

  for (const field of assetFields) {
    if (!(field in entry.data)) {
      continue;
    }

    const assetPath = entry.data[field];
    if (typeof assetPath !== "string" || !assetPath.startsWith("/")) {
      errors.push(`${relativePath(entry.filePath)}: "${field}" must be a root-relative path`);
      continue;
    }

    if (!fileExists(path.join(rootDir, assetPath.slice(1)))) {
      errors.push(`${relativePath(entry.filePath)}: "${field}" points to a missing file (${assetPath})`);
    }
  }
}

function validateLegacySources(video, errors, rootDir) {
  const legacySources = video.data.legacySources;

  if (!isPlainObject(legacySources)) {
    errors.push(`${relativePath(video.filePath)}: "legacySources" must be an object for legacy-local videos`);
    return;
  }

  if (video.data.provider !== "legacy-local") {
    errors.push(`${relativePath(video.filePath)}: "legacySources" is only allowed when provider is "legacy-local"`);
  }

  for (const key of ["webm", "mp4"]) {
    if (!(key in legacySources)) {
      errors.push(`${relativePath(video.filePath)}: legacy source "${key}" is required for legacy-local videos`);
      continue;
    }

    const sourcePath = legacySources[key];
    if (typeof sourcePath !== "string" || !sourcePath.startsWith("/content/")) {
      errors.push(`${relativePath(video.filePath)}: legacy source "${key}" must be a /content/ path`);
      continue;
    }

    if (!fileExists(path.join(rootDir, sourcePath.slice(1)))) {
      errors.push(`${relativePath(video.filePath)}: legacy source "${key}" points to a missing file (${sourcePath})`);
    }
  }
}

function validateGrandfatheredLegacyVideo(video, errors) {
  if (typeof video.data.slug !== "string") {
    return;
  }

  if (!LEGACY_VIDEO_SLUG_ALLOWLIST.has(video.data.slug)) {
    errors.push(
      `${relativePath(video.filePath)}: "legacy-local" is reserved for existing grandfathered videos; use an external embed provider for new entries`,
    );
  }
}

function trackDuplicateSlug(entry, slugMap, errors) {
  if (typeof entry.data.slug !== "string") {
    return;
  }

  const existingFile = slugMap.get(entry.data.slug);
  if (existingFile) {
    errors.push(
      `${relativePath(entry.filePath)}: duplicate slug "${entry.data.slug}" also used by ${relativePath(existingFile)}`,
    );
    return;
  }

  slugMap.set(entry.data.slug, entry.filePath);
}

function validateBooleanField(entry, field, errors) {
  if (field in entry.data && typeof entry.data[field] !== "boolean") {
    errors.push(`${relativePath(entry.filePath)}: "${field}" must be a boolean`);
  }
}

function parseFrontMatter(filePath, raw) {
  if (!raw.startsWith("---\n")) {
    throw new Error(`${relativePath(filePath)}: missing opening front matter delimiter`);
  }

  const closingIndex = raw.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    throw new Error(`${relativePath(filePath)}: missing closing front matter delimiter`);
  }

  const frontMatterBlock = raw.slice(4, closingIndex);
  const body = raw.slice(closingIndex + 5).trim();
  const frontMatter = {};
  let activeArrayKey = null;

  for (const line of frontMatterBlock.split("\n")) {
    if (line.trim() === "") {
      continue;
    }

    if (line.startsWith("  - ")) {
      if (!activeArrayKey) {
        throw new Error(`${relativePath(filePath)}: array item found before an array key`);
      }

      frontMatter[activeArrayKey].push(line.slice(4));
      continue;
    }

    activeArrayKey = null;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`${relativePath(filePath)}: invalid front matter line "${line}"`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (rawValue === "") {
      frontMatter[key] = [];
      activeArrayKey = key;
      continue;
    }

    frontMatter[key] = parseScalar(rawValue);
  }

  return { frontMatter, body };
}

function parseScalar(rawValue) {
  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  return rawValue;
}

async function readContentFiles(directoryPath, extension) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension) && entry.name !== ".gitkeep")
    .map((entry) => ({
      absolutePath: path.join(directoryPath, entry.name),
      filename: entry.name,
    }))
    .sort((left, right) => left.filename.localeCompare(right.filename));
}

function isValidDateString(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isOptionalUrl(value) {
  return typeof value === "string" && isHttpsUrl(value);
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fileExists(filePath) {
  return existsSync(filePath);
}

function relativePath(filePath) {
  return path.relative(process.cwd(), filePath) || filePath;
}
