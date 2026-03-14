const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");

test("laojun feishu account disables reply-mode delivery", () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "openclaw.json"), "utf8")
  );

  assert.equal(config.channels.feishu.accounts.laojun.replyToMode, "off");
});
