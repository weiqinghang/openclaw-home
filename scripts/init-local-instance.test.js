const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const REPO_ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "init-local-instance.js");

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-init-test-"));
}

function copySeedFiles(rootDir) {
  fs.copyFileSync(
    path.join(REPO_ROOT, "openclaw.template.json"),
    path.join(rootDir, "openclaw.template.json")
  );
  fs.copyFileSync(
    path.join(REPO_ROOT, "secrets.local.example.json"),
    path.join(rootDir, "secrets.local.example.json")
  );
  fs.writeFileSync(path.join(rootDir, "openclaw.json"), "{\n  \"sentinel\": true\n}\n");
}

test("refuses to overwrite instance files without --force", () => {
  const rootDir = makeTempRoot();
  copySeedFiles(rootDir);

  const result = spawnSync(
    "node",
    [
      SCRIPT,
      "--root-dir",
      rootDir,
      "--user-name",
      "tester",
      "--feishu-user-id",
      "ou_test"
    ],
    { encoding: "utf8" }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to overwrite existing file/);
});

test("creates local instance files and backups with --force", () => {
  const rootDir = makeTempRoot();
  copySeedFiles(rootDir);

  execFileSync(
    "node",
    [
      SCRIPT,
      "--root-dir",
      rootDir,
      "--user-name",
      "tester",
      "--feishu-user-id",
      "ou_test",
      "--feishu-app-id",
      "cli_test",
      "--force"
    ],
    { encoding: "utf8" }
  );

  const config = JSON.parse(fs.readFileSync(path.join(rootDir, "openclaw.json"), "utf8"));
  const secrets = JSON.parse(fs.readFileSync(path.join(rootDir, "secrets.local.json"), "utf8"));

  assert.equal(config.hooks.internal.entries["user-permissions"].config.userRules[0].match.userIds[0], "ou_test");
  assert.equal(config.channels.feishu.accounts.wukong.appId, "cli_test");
  assert.equal(config.channels.feishu.groupAllowFrom, undefined);
  assert.equal(config.channels.feishu.userAllowlist, undefined);
  assert.equal(config.channels.feishu.requireMention, undefined);
  assert.equal(config.channels.feishu.groupPolicy, undefined);
  assert.equal(config.channels.feishu.defaultAccount, "wukong");
  assert.equal(config.channels.feishu.accounts.wukong.groupPolicy, undefined);
  assert.ok(config.agents.list[0].agentDir.includes("/Users/tester/.openclaw/agents/wukong/agent"));
  assert.equal(
    secrets.channels.feishu.accounts.guichengxiang.appSecret,
    "your-feishu-app-secret"
  );

  const backups = fs.readdirSync(rootDir).filter((name) => name.startsWith("openclaw.json.bak-"));
  assert.equal(backups.length, 1);
});
