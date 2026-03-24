#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

export async function prepareContentPublisherWorktree({
  repoDir = process.cwd(),
  targetPath,
} = {}) {
  const repoRoot = (await captureCommand("git", ["rev-parse", "--show-toplevel"], { cwd: repoDir })).trim();
  const destination = targetPath
    ? path.resolve(targetPath)
    : path.resolve(repoRoot, "..", "gotlandstider-content-publisher");

  await ensurePathAvailable(destination);
  await captureCommand("git", ["rev-parse", "--verify", "origin/main"], { cwd: repoRoot });
  await runCommand("git", ["worktree", "add", "--detach", destination, "origin/main"], { cwd: repoRoot });

  return {
    repoRoot,
    destination,
  };
}

async function ensurePathAvailable(destination) {
  try {
    await fs.access(destination);
  } catch {
    return;
  }

  throw new Error(
    [
      `Refusing to reuse existing path: ${destination}`,
      "Choose another --path or remove the old publisher worktree first.",
    ].join("\n"),
  );
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
    if (token === "--path") {
      args.targetPath = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const result = await prepareContentPublisherWorktree(parseArgs(process.argv.slice(2)));
  console.log(`Prepared clean content-publisher worktree at ${result.destination}`);
  console.log("Next: run the Content Publisher skill from that path, then use publisher:preflight and publisher:open-pr.");
}
