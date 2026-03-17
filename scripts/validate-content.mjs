#!/usr/bin/env node

import { formatValidationErrors, validateContentCollections } from "./lib/content-validation.mjs";

const result = await validateContentCollections(process.cwd());

if (!result.valid) {
  console.error("Content validation failed:");
  console.error(formatValidationErrors(result.errors));
  process.exit(1);
}

console.log(
  `Content validation passed for ${result.articles.length} article(s).`,
);
