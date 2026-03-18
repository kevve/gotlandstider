#!/usr/bin/env node

import { writeSeoOutputs } from "./lib/seo-generation.mjs";

await writeSeoOutputs(process.cwd());

console.log("Generated sitemap.xml and homepage structured data from public article content.");
