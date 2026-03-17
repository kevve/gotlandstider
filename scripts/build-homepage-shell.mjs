#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

import { loadSiteShell, renderSiteShell } from "./lib/site-shell.mjs";

const HEADER_START = "<!-- GENERATED_SITE_HEADER_START -->";
const HEADER_END = "<!-- GENERATED_SITE_HEADER_END -->";
const FOOTER_START = "<!-- GENERATED_SITE_FOOTER_START -->";
const FOOTER_END = "<!-- GENERATED_SITE_FOOTER_END -->";

export async function writeHomepageShell(rootDir = process.cwd()) {
  const indexPath = path.join(rootDir, "index.html");
  const [indexHtml, shellTemplates] = await Promise.all([
    fs.readFile(indexPath, "utf8"),
    loadSiteShell(rootDir),
  ]);

  const shell = renderSiteShell({
    ...shellTemplates,
    brandHref: "#",
    activeNavKey: null,
  });

  const nextHtml = replaceBlock(
    replaceBlock(indexHtml, HEADER_START, HEADER_END, shell.siteHeader),
    FOOTER_START,
    FOOTER_END,
    shell.siteFooter,
  );

  await fs.writeFile(indexPath, `${nextHtml.trim()}\n`, "utf8");

  return {
    header: shell.siteHeader,
    footer: shell.siteFooter,
  };
}

function replaceBlock(document, startMarker, endMarker, content) {
  const startIndex = document.indexOf(startMarker);
  const endIndex = document.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Missing marker block: ${startMarker} ... ${endMarker}`);
  }

  const before = document.slice(0, startIndex + startMarker.length);
  const after = document.slice(endIndex);

  return `${before}\n${content}\n${after}`;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await writeHomepageShell(process.cwd());
  console.log("Generated shared homepage header and footer from the site shell.");
}
