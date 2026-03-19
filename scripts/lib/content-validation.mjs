import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { parse as parseYaml } from "yaml";

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
  const articleEntries = await readContentFiles(articlesDir, ".md");

  const articles = await Promise.all(
    articleEntries.map(async (entry) => {
      const raw = await fs.readFile(entry.absolutePath, "utf8");
      return parseArticleFile(entry.absolutePath, raw);
    }),
  );

  return { articles };
}

export async function validateContentCollections(rootDir = process.cwd()) {
  const { articles } = await loadContentCollections(rootDir);
  const errors = validateArticles(articles, rootDir);

  return {
    articles,
    errors,
    valid: errors.length === 0,
  };
}

export function formatValidationErrors(errors) {
  return errors.map((error) => `- ${error}`).join("\n");
}

export function parseArticleFile(filePath, raw) {
  const { frontMatter, body } = parseFrontMatter(filePath, raw);
  const normalizedFrontMatter = normalizeArticleFrontMatter(frontMatter);

  return {
    filePath,
    filename: path.basename(filePath),
    stem: path.basename(filePath, path.extname(filePath)),
    body,
    data: normalizedFrontMatter,
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
    validateVideoFields(article, errors, rootDir);
    validateHomepageFields(article, errors);
    trackDuplicateSlug(article, slugMap, errors);
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
    if (field in entry.data) {
      validateRootRelativeAssetPath({
        entry,
        value: entry.data[field],
        field,
        errors,
        rootDir,
      });
    }
  }
}

function validateVideoFields(article, errors, rootDir) {
  if (!("video" in article.data)) {
    return;
  }

  const { video } = article.data;

  if (!isPlainObject(video)) {
    errors.push(`${relativePath(article.filePath)}: "video" must be an object`);
    return;
  }

  for (const field of ["provider", "embedUrl", "thumbnail", "socialLinks"]) {
    if (!(field in video)) {
      errors.push(`${relativePath(article.filePath)}: video.${field} is required when "video" is present`);
    }
  }

  if ("provider" in video && typeof video.provider !== "string") {
    errors.push(`${relativePath(article.filePath)}: "video.provider" must be a string`);
  }

  if ("embedUrl" in video && !isOptionalUrl(video.embedUrl)) {
    errors.push(`${relativePath(article.filePath)}: "video.embedUrl" must be an https URL`);
  }

  if ("thumbnail" in video) {
    validateRootRelativeAssetPath({
      entry: article,
      value: video.thumbnail,
      field: "video.thumbnail",
      errors,
      rootDir,
    });
  }

  if ("socialLinks" in video) {
    validateSocialLinks(video.socialLinks, article.filePath, errors, "video.socialLinks");
  }

  if (video.provider === "legacy-local") {
    validateGrandfatheredLegacyVideo(article, errors);
    validateLegacySources(article, video.legacySources, errors, rootDir);
  } else if ("legacySources" in video) {
    validateLegacySources(article, video.legacySources, errors, rootDir, false);
  }
}

function validateHomepageFields(article, errors) {
  if (!("homepage" in article.data)) {
    return;
  }

  const { homepage } = article.data;

  if (!isPlainObject(homepage)) {
    errors.push(`${relativePath(article.filePath)}: "homepage" must be an object`);
    return;
  }

  if (!("video" in article.data)) {
    errors.push(`${relativePath(article.filePath)}: "homepage" metadata is only allowed for articles with a "video" block`);
  }

  if ("badge" in homepage && typeof homepage.badge !== "string") {
    errors.push(`${relativePath(article.filePath)}: "homepage.badge" must be a string`);
  }

  if ("subtitle" in homepage && typeof homepage.subtitle !== "string") {
    errors.push(`${relativePath(article.filePath)}: "homepage.subtitle" must be a string`);
  }

  if ("order" in homepage && !Number.isInteger(homepage.order)) {
    errors.push(`${relativePath(article.filePath)}: "homepage.order" must be an integer`);
  }

  if ("description" in homepage && typeof homepage.description !== "string") {
    errors.push(`${relativePath(article.filePath)}: "homepage.description" must be a string`);
  }

  if ("heading" in homepage) {
    if (!isPlainObject(homepage.heading)) {
      errors.push(`${relativePath(article.filePath)}: "homepage.heading" must be an object`);
    } else {
      if ("prefix" in homepage.heading && typeof homepage.heading.prefix !== "string") {
        errors.push(`${relativePath(article.filePath)}: "homepage.heading.prefix" must be a string`);
      }
      if ("accent" in homepage.heading && typeof homepage.heading.accent !== "string") {
        errors.push(`${relativePath(article.filePath)}: "homepage.heading.accent" must be a string`);
      }
    }
  }

  if ("highlights" in homepage) {
    if (!Array.isArray(homepage.highlights)) {
      errors.push(`${relativePath(article.filePath)}: "homepage.highlights" must be an array`);
    } else {
      homepage.highlights.forEach((highlight, index) => {
        if (!isPlainObject(highlight)) {
          errors.push(`${relativePath(article.filePath)}: "homepage.highlights[${index}]" must be an object`);
          return;
        }

        for (const field of ["label", "title", "description"]) {
          if (!(field in highlight) || typeof highlight[field] !== "string" || highlight[field].trim() === "") {
            errors.push(
              `${relativePath(article.filePath)}: "homepage.highlights[${index}].${field}" must be a non-empty string`,
            );
          }
        }
      });
    }
  }
}

function validateLegacySources(article, legacySources, errors, rootDir, requireLegacyProvider = true) {
  if (!isPlainObject(legacySources)) {
    errors.push(`${relativePath(article.filePath)}: "video.legacySources" must be an object for legacy-local videos`);
    return;
  }

  if (requireLegacyProvider === false) {
    errors.push(`${relativePath(article.filePath)}: "video.legacySources" is only allowed when video.provider is "legacy-local"`);
  }

  for (const key of ["webm", "mp4"]) {
    if (!(key in legacySources)) {
      errors.push(`${relativePath(article.filePath)}: video.legacySources.${key} is required for legacy-local videos`);
      continue;
    }

    const sourcePath = legacySources[key];
    if (typeof sourcePath !== "string" || !sourcePath.startsWith("/content/")) {
      errors.push(`${relativePath(article.filePath)}: video.legacySources.${key} must be a /content/ path`);
      continue;
    }

    if (!fileExists(path.join(rootDir, sourcePath.slice(1)))) {
      errors.push(
        `${relativePath(article.filePath)}: video.legacySources.${key} points to a missing file (${sourcePath})`,
      );
    }
  }
}

function validateGrandfatheredLegacyVideo(article, errors) {
  if (typeof article.data.slug !== "string") {
    return;
  }

  if (!LEGACY_VIDEO_SLUG_ALLOWLIST.has(article.data.slug)) {
    errors.push(
      `${relativePath(article.filePath)}: "video.provider: legacy-local" is reserved for existing grandfathered videos; use an external embed provider for new entries`,
    );
  }
}

function validateSocialLinks(socialLinks, filePath, errors, fieldName) {
  if (!isPlainObject(socialLinks)) {
    errors.push(`${relativePath(filePath)}: "${fieldName}" must be an object`);
    return;
  }

  for (const [key, value] of Object.entries(socialLinks)) {
    if (value !== null && !isHttpsUrl(value)) {
      errors.push(`${relativePath(filePath)}: ${fieldName}.${key} must be null or an https URL`);
    }
  }
}

function validateRootRelativeAssetPath({ entry, value, field, errors, rootDir }) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    errors.push(`${relativePath(entry.filePath)}: "${field}" must be a root-relative path`);
    return;
  }

  if (!fileExists(path.join(rootDir, value.slice(1)))) {
    errors.push(`${relativePath(entry.filePath)}: "${field}" points to a missing file (${value})`);
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
  let frontMatter;

  try {
    frontMatter = parseYaml(frontMatterBlock);
  } catch (error) {
    throw new Error(`${relativePath(filePath)}: invalid YAML front matter (${error.message})`);
  }

  if (!isPlainObject(frontMatter)) {
    throw new Error(`${relativePath(filePath)}: front matter must be a YAML object`);
  }

  return { frontMatter, body };
}

function normalizeArticleFrontMatter(frontMatter) {
  const normalizedFrontMatter = structuredClone(frontMatter);

  if (isPlainObject(normalizedFrontMatter.video?.socialLinks)) {
    for (const [key, value] of Object.entries(normalizedFrontMatter.video.socialLinks)) {
      if (typeof value === "string" && value.trim() === "") {
        normalizedFrontMatter.video.socialLinks[key] = null;
      }
    }
  }

  pruneEmptyObjects(normalizedFrontMatter, [
    ["video", "legacySources"],
    ["video"],
    ["homepage", "heading"],
    ["homepage"],
  ]);

  return normalizedFrontMatter;
}

function pruneEmptyObjects(root, paths) {
  for (const segments of paths) {
    removeObjectIfEmpty(root, segments);
  }
}

function removeObjectIfEmpty(root, segments) {
  if (!isPlainObject(root) || segments.length === 0) {
    return;
  }

  let parent = root;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const next = parent[segments[index]];

    if (!isPlainObject(next)) {
      return;
    }

    parent = next;
  }

  const finalKey = segments.at(-1);
  const value = parent[finalKey];

  if (isPlainObject(value) && isEffectivelyEmptyObject(value)) {
    delete parent[finalKey];
  }
}

function isEffectivelyEmptyObject(value) {
  return Object.values(value).every((entry) => isEffectivelyEmptyValue(entry));
}

function isEffectivelyEmptyValue(value) {
  if (value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (isPlainObject(value)) {
    return isEffectivelyEmptyObject(value);
  }

  return false;
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
