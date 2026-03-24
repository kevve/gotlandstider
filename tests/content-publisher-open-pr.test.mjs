import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_DECAP_WORKFLOW_LABEL,
  parseArgs,
  runContentPublisherOpenPr,
} from "../scripts/content-publisher-open-pr.mjs";

test("runContentPublisherOpenPr creates, labels, and verifies a Decap PR", async () => {
  const calls = [];
  const state = {
    created: false,
    labelApplied: false,
  };

  const result = await runContentPublisherOpenPr(
    {
      rootDir: "/repo",
      branch: "cms/articles/smoke-test",
      base: "main",
      title: "Create Decap draft article: Smoke test",
      body: "Decap draft article generated from the intake folder transcript via $content-writer.",
      lookupAttempts: 1,
      lookupDelayMs: 0,
    },
    createRuntime({ calls, state }),
  );

  assert.equal(result.created, true);
  assert.equal(result.number, 42);
  assert.equal(result.url, "https://github.com/kevve/gotlandstider/pull/42");
  assert.deepEqual(result.labels, [DEFAULT_DECAP_WORKFLOW_LABEL]);
  assert.deepEqual(
    calls.filter((call) => call.type === "run").map((call) => `${call.command} ${call.args.join(" ")}`),
    [
      "gh auth status",
      "gh pr create --base main --head cms/articles/smoke-test --title Create Decap draft article: Smoke test --body Decap draft article generated from the intake folder transcript via $content-writer.",
      "gh pr edit 42 --add-label decap-cms/draft",
    ],
  );
});

test("runContentPublisherOpenPr reuses an existing labeled Decap PR", async () => {
  const calls = [];
  const state = {
    created: true,
    labelApplied: true,
  };

  const result = await runContentPublisherOpenPr(
    {
      rootDir: "/repo",
      branch: "cms/articles/smoke-test",
      title: "Create Decap draft article: Smoke test",
      body: "Body",
      lookupAttempts: 1,
      lookupDelayMs: 0,
    },
    createRuntime({ calls, state }),
  );

  assert.equal(result.created, false);
  assert.equal(result.number, 42);
  assert.deepEqual(
    calls.filter((call) => call.type === "run").map((call) => `${call.command} ${call.args.join(" ")}`),
    ["gh auth status"],
  );
});

test("runContentPublisherOpenPr fails fast when the required label is still missing after PR edit", async () => {
  const calls = [];
  const state = {
    created: false,
    labelApplied: false,
    blockLabelMutation: true,
  };

  await assert.rejects(
    () =>
      runContentPublisherOpenPr(
        {
          rootDir: "/repo",
          branch: "cms/articles/smoke-test",
          title: "Create Decap draft article: Smoke test",
          body: "Body",
          lookupAttempts: 1,
          lookupDelayMs: 0,
        },
        createRuntime({ calls, state }),
      ),
    /missing the required Decap workflow label "decap-cms\/draft"/,
  );

  assert.ok(
    calls.some(
      (call) =>
        call.type === "run" &&
        call.command === "gh" &&
        call.args.join(" ") === "pr edit 42 --add-label decap-cms/draft",
    ),
  );
});

test("runContentPublisherOpenPr refuses to overwrite another Decap workflow label", async () => {
  const calls = [];
  const state = {
    created: true,
    existingLabels: ["decap-cms/pending_review"],
  };

  await assert.rejects(
    () =>
      runContentPublisherOpenPr(
        {
          rootDir: "/repo",
          branch: "cms/articles/smoke-test",
          title: "Create Decap draft article: Smoke test",
          body: "Body",
          lookupAttempts: 1,
          lookupDelayMs: 0,
        },
        createRuntime({ calls, state }),
      ),
    /already has another Decap workflow label/,
  );

  assert.deepEqual(
    calls.filter((call) => call.type === "run").map((call) => `${call.command} ${call.args.join(" ")}`),
    ["gh auth status"],
  );
});

test("runContentPublisherOpenPr tolerates Decap automerge alongside the workflow label", async () => {
  const calls = [];
  const state = {
    created: true,
    existingLabels: ["decap-cms/draft", "decap-cms/automerge"],
  };

  const result = await runContentPublisherOpenPr(
    {
      rootDir: "/repo",
      branch: "cms/articles/smoke-test",
      title: "Create Decap draft article: Smoke test",
      body: "Body",
      lookupAttempts: 1,
      lookupDelayMs: 0,
    },
    createRuntime({ calls, state }),
  );

  assert.equal(result.created, false);
  assert.deepEqual(result.labels, ["decap-cms/automerge", "decap-cms/draft"]);
  assert.deepEqual(
    calls.filter((call) => call.type === "run").map((call) => `${call.command} ${call.args.join(" ")}`),
    ["gh auth status"],
  );
});

test("parseArgs reads branch, title, body, body file, and label overrides", () => {
  const args = parseArgs([
    "--branch",
    "cms/articles/smoke-test",
    "--base",
    "release",
    "--title",
    "PR title",
    "--body",
    "PR body",
    "--body-file",
    "body.md",
    "--label",
    "decap-cms/pending_review",
  ]);

  assert.deepEqual(args, {
    branch: "cms/articles/smoke-test",
    base: "release",
    title: "PR title",
    body: "PR body",
    bodyFile: "body.md",
    label: "decap-cms/pending_review",
  });
});

function createRuntime({ calls, state }) {
  return {
    async runCommand(command, args) {
      calls.push({ type: "run", command, args });

      if (command === "gh" && args[0] === "pr" && args[1] === "create") {
        state.created = true;
        return;
      }

      if (command === "gh" && args[0] === "pr" && args[1] === "edit" && !state.blockLabelMutation) {
        state.labelApplied = true;
      }
    },
    async captureCommand(command, args) {
      calls.push({ type: "capture", command, args });

      if (command === "git" && args.join(" ") === "branch --show-current") {
        return "cms/articles/smoke-test\n";
      }

      if (command === "gh" && args[0] === "pr" && args[1] === "list") {
        if (!state.created) {
          return "[]";
        }

        return JSON.stringify([
          {
            number: 42,
            url: "https://github.com/kevve/gotlandstider/pull/42",
            headRefName: "cms/articles/smoke-test",
            baseRefName: "main",
            title: "Create Decap draft article: Smoke test",
            labels: getRuntimeLabels(state),
            isDraft: false,
          },
        ]);
      }

      if (command === "gh" && args[0] === "pr" && args[1] === "view") {
        return JSON.stringify({
          number: 42,
          url: "https://github.com/kevve/gotlandstider/pull/42",
          state: "OPEN",
          headRefName: "cms/articles/smoke-test",
          baseRefName: "main",
          title: "Create Decap draft article: Smoke test",
          labels: getRuntimeLabels(state),
          isDraft: false,
        });
      }

      throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
    },
  };
}

function getRuntimeLabels(state) {
  if (Array.isArray(state.existingLabels)) {
    return state.existingLabels.map((name) => ({ name }));
  }

  return state.labelApplied ? [{ name: DEFAULT_DECAP_WORKFLOW_LABEL }] : [];
}
