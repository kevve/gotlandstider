#!/usr/bin/env node

import process from "node:process";
import { spawn } from "node:child_process";

export const DEFAULT_DECAP_WORKFLOW_LABEL = "decap-cms/draft";
const DECAP_WORKFLOW_STATUS_SUFFIXES = ["draft", "pending_review", "pending_publish"];

export async function runContentPublisherOpenPr(
  {
    rootDir = process.cwd(),
    branch,
    base = "main",
    title,
    body,
    bodyFile,
    label = DEFAULT_DECAP_WORKFLOW_LABEL,
    lookupAttempts = 5,
    lookupDelayMs = 1000,
  } = {},
  dependencies = {},
) {
  if (!branch) {
    throw new Error('Missing required "--branch" value.');
  }

  if (!title) {
    throw new Error('Missing required "--title" value.');
  }

  if (!body && !bodyFile) {
    throw new Error('Provide either "--body" or "--body-file".');
  }

  const runtime = {
    runCommand: dependencies.runCommand ?? runCommand,
    captureCommand: dependencies.captureCommand ?? captureCommand,
  };

  await runtime.runCommand("gh", ["auth", "status"], { cwd: rootDir });

  const currentBranch = normalizeLine(
    await runtime.captureCommand("git", ["branch", "--show-current"], { cwd: rootDir }),
  );

  if (currentBranch !== branch) {
    throw new Error(
      [
        `Expected current branch "${branch}" before opening the PR.`,
        `Found "${currentBranch || "(detached HEAD)"}" instead.`,
      ].join("\n"),
    );
  }

  let pullRequest = await findOpenPullRequestByBranch({ rootDir, branch }, runtime);
  const created = !pullRequest;

  if (!pullRequest) {
    await createPullRequest({ rootDir, branch, base, title, body, bodyFile }, runtime);
    pullRequest = await waitForOpenPullRequestByBranch(
      { rootDir, branch, attempts: lookupAttempts, delayMs: lookupDelayMs },
      runtime,
    );
  }

  if (!pullRequest) {
    throw new Error(`Could not find an open pull request for branch "${branch}" after creation.`);
  }

  const existingLabels = getLabelNames(pullRequest.labels);
  const conflictingLabels = findConflictingWorkflowLabels(existingLabels, label);

  if (conflictingLabels.length > 0) {
    throw new Error(
      [
        `PR #${pullRequest.number} already has another Decap workflow label.`,
        "Refusing to overwrite an existing workflow state.",
        ...conflictingLabels.map((entry) => `- ${entry}`),
      ].join("\n"),
    );
  }

  if (!existingLabels.includes(label)) {
    await runtime.runCommand("gh", ["pr", "edit", String(pullRequest.number), "--add-label", label], {
      cwd: rootDir,
    });
  }

  const verifiedPullRequest = await verifyPullRequest(
    { rootDir, number: pullRequest.number, branch, base, label },
    runtime,
  );

  return {
    ...verifiedPullRequest,
    created,
  };
}

async function createPullRequest({ rootDir, branch, base, title, body, bodyFile }, runtime) {
  const args = ["pr", "create", "--base", base, "--head", branch, "--title", title];

  if (bodyFile) {
    args.push("--body-file", bodyFile);
  } else {
    args.push("--body", body);
  }

  await runtime.runCommand("gh", args, { cwd: rootDir });
}

async function findOpenPullRequestByBranch({ rootDir, branch }, runtime) {
  const pullRequests = await captureJsonCommand(
    runtime,
    "gh",
    ["pr", "list", "--head", branch, "--state", "open", "--json", "number,url,headRefName,baseRefName,title,labels,isDraft"],
    { cwd: rootDir },
  );

  if (pullRequests.length > 1) {
    throw new Error(`Expected at most one open pull request for branch "${branch}", found ${pullRequests.length}.`);
  }

  return pullRequests[0] ?? null;
}

async function waitForOpenPullRequestByBranch({ rootDir, branch, attempts, delayMs }, runtime) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const pullRequest = await findOpenPullRequestByBranch({ rootDir, branch }, runtime);
    if (pullRequest) {
      return pullRequest;
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return null;
}

async function verifyPullRequest({ rootDir, number, branch, base, label }, runtime) {
  const pullRequest = await captureJsonCommand(
    runtime,
    "gh",
    ["pr", "view", String(number), "--json", "number,url,state,headRefName,baseRefName,title,labels,isDraft"],
    { cwd: rootDir },
  );

  const labels = getLabelNames(pullRequest.labels);

  if (pullRequest.state !== "OPEN") {
    throw new Error(`PR #${number} must stay open for Decap workflow. Found state "${pullRequest.state}".`);
  }

  if (pullRequest.headRefName !== branch) {
    throw new Error(`PR #${number} head branch mismatch. Expected "${branch}", found "${pullRequest.headRefName}".`);
  }

  if (pullRequest.baseRefName !== base) {
    throw new Error(`PR #${number} base branch mismatch. Expected "${base}", found "${pullRequest.baseRefName}".`);
  }

  if (!labels.includes(label)) {
    throw new Error(
      [
        `PR #${number} is missing the required Decap workflow label "${label}".`,
        "Decap will not treat this PR as an unpublished editorial-workflow entry.",
      ].join("\n"),
    );
  }

  return {
    number: pullRequest.number,
    url: pullRequest.url,
    state: pullRequest.state,
    headRefName: pullRequest.headRefName,
    baseRefName: pullRequest.baseRefName,
    title: pullRequest.title,
    isDraft: pullRequest.isDraft,
    labels,
  };
}

async function captureJsonCommand(runtime, command, args, options = {}) {
  const output = await runtime.captureCommand(command, args, options);

  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(
      [`Failed to parse JSON from "${command} ${args.join(" ")}".`, output.trim(), error.message]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function getLabelNames(labels = []) {
  return labels
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }

      if (entry && typeof entry.name === "string") {
        return entry.name;
      }

      return null;
    })
    .filter(Boolean)
    .sort();
}

function findConflictingWorkflowLabels(labels, desiredLabel) {
  const separatorIndex = desiredLabel.lastIndexOf("/");
  if (separatorIndex === -1) {
    return [];
  }

  const workflowPrefix = desiredLabel.slice(0, separatorIndex + 1);
  const knownWorkflowLabels = new Set(
    DECAP_WORKFLOW_STATUS_SUFFIXES.map((suffix) => `${workflowPrefix}${suffix}`),
  );

  return labels.filter((entry) => entry !== desiredLabel && knownWorkflowLabels.has(entry));
}

function sleep(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function normalizeLine(value) {
  return value.trim();
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

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--branch") {
      args.branch = argv[index + 1];
      index += 1;
    } else if (token === "--base") {
      args.base = argv[index + 1];
      index += 1;
    } else if (token === "--title") {
      args.title = argv[index + 1];
      index += 1;
    } else if (token === "--body") {
      args.body = argv[index + 1];
      index += 1;
    } else if (token === "--body-file") {
      args.bodyFile = argv[index + 1];
      index += 1;
    } else if (token === "--label") {
      args.label = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = parseArgs(process.argv.slice(2));
  const result = await runContentPublisherOpenPr(args);
  const requestedLabel = args.label ?? DEFAULT_DECAP_WORKFLOW_LABEL;
  console.log(`${result.created ? "Opened" : "Reused"} PR #${result.number}: ${result.url}`);
  console.log(`Verified Decap workflow label ${requestedLabel} on ${result.headRefName} -> ${result.baseRefName}.`);
}
