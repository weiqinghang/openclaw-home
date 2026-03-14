const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "create-project-agent.js");

test("dry-run reports account-scoped feishu updates", () => {
  const result = spawnSync(
    "node",
    [
      SCRIPT,
      "alpha",
      "--project-name",
      "Alpha 项目",
      "--group-id",
      "oc_test",
      "--owner",
      "laojun",
      "--owner-user-id",
      "ou_test",
      "--dry-run"
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.ok(
    payload.actions.includes("append channels.feishu.accounts.laojun.groupAllowFrom <- oc_test")
  );
  assert.ok(
    payload.actions.includes("set channels.feishu.accounts.laojun.groups.oc_test.requireMention = false")
  );
  assert.ok(
    payload.actions.includes("append channels.feishu.accounts.laojun.groups.oc_test.allowFrom <- ou_test")
  );
  assert.equal(
    payload.actions.some((line) => line.includes("channels.feishu.groupAllowFrom")),
    false
  );
});
