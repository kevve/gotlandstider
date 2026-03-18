#!/usr/bin/env node

import { writeContentIndexes } from "./lib/content-indexes.mjs";

const indexes = await writeContentIndexes(process.cwd());

console.log(
  `Generated ${indexes.articles.items.length} article index entr${
    indexes.articles.items.length === 1 ? "y" : "ies"
  }, featured content JSON, and homepage JSON.`,
);
