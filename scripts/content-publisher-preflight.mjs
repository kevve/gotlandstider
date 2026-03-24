#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const GENERATED_RESTORE_PATHS = [
  "articles",
  path.join("generated", "content"),
  "index.html",
  "output.css",
  "sitemap.xml",
];

export async function runContentPublisherPreflight({
  rootDir = process.cwd(),
  expected,
} = {}) {
  if (!expected) {
    throw new Error('Missing required "--expected" path.');
  }

  const normalizedExpected = normalizeRepoPath(expected);
  const trackedChangesBeforeCheck = await getChangedTrackedFiles(rootDir);
  const unexpectedBeforeCheck = trackedChangesBeforeCheck.filter((entry) => entry !== normalizedExpected);

  if (trackedChangesBeforeCheck.length === 0) {
    throw new Error(
      `No tracked changes detected. Expected only "${normalizedExpected}" before publisher preflight.`,
    );
  }

  if (unexpectedBeforeCheck.length > 0) {
    throw new Error(
      [
        "Content Publisher preflight must run in a clean publisher worktree or clone.",
        `Expected tracked changes before validation: only ${normalizedExpected}`,
        "Found:",
        ...trackedChangesBeforeCheck.map((entry) => `- ${entry}`),
      ].join("\n"),
    );
  }

  await runCommand("npm", ["run", "check:site"], { cwd: rootDir });
  await resetGeneratedOutputs(rootDir);
  await verifyPrScope(rootDir, normalizedExpected);

  return {
    expected: normalizedExpected,
    restoredPaths: GENERATED_RESTORE_PATHS,
  };
}

async function resetGeneratedOutputs(rootDir) {
  await Promise.all([
    fs.rm(path.join(rootDir, "articles"), { recursive: true, force: true }),
    fs.rm(path.join(rootDir, "generated", "content"), { recursive: true, force: true }),
  ]);

  await runCommand("git", ["restore", "--worktree", "--staged", "--", ...GENERATED_RESTORE_PATHS], {
    cwd: rootDir,
  });
}

async function getChangedTrackedFiles(rootDir) {
  const output = await captureCommand("git", ["diff", "--name-only", "HEAD"], { cwd: rootDir });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeRepoPath)
    .sort();
}

async function verifyPrScope(rootDir, expected) {
  const changedTrackedFiles = await getChangedTrackedFiles(rootDir);
  const unexpectedTrackedFiles = changedTrackedFiles.filter((entry) => entry !== expected);

  if (changedTrackedFiles.length === 0) {
    throw new Error("No tracked file changes detected.");
  }

  if (unexpectedTrackedFiles.length > 0 || changedTrackedFiles.length !== 1) {
    throw new Error(
      [
        "PR scope check failed.",
        `Expected only: ${expected}`,
        "Found tracked changes:",
        ...changedTrackedFiles.map((entry) => `- ${entry}`),
      ].join("\n"),
    );
  }
}

function normalizeRepoPath(value) {
  return value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function captureCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} failed with code ${code}`));
    });
  });
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--expected") {
      args.expected = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = parseArgs(process.argv.slice(2));
  await runContentPublisherPreflight(args);
  console.log(`Content Publisher preflight passed for ${normalizeRepoPath(args.expected)}.`);
}
