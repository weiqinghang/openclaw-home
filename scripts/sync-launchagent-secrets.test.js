const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO_ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "sync-launchagent-secrets.js");

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-launchagent-test-"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readPlistJson(filePath) {
  return JSON.parse(execFileSync("plutil", ["-convert", "json", "-o", "-", filePath], { encoding: "utf8" }));
}

test("syncs gateway token and feishu app secrets into plist environment variables", () => {
  const rootDir = makeTempRoot();
  const plistPath = path.join(rootDir, "gateway.plist");
  const secretsPath = path.join(rootDir, "secrets.local.json");

  fs.writeFileSync(
    plistPath,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
`
  );
  writeJson(secretsPath, {
    runtime: {
      OPENCLAW_GATEWAY_TOKEN: "token-123"
    },
    providers: {
      "minimax-cn": {
        apiKey: "key"
      }
    },
    channels: {
      feishu: {
        accounts: {
          laojun: {
            appSecret: "secret-laojun"
          },
          wukong: {
            appSecret: "secret-wukong"
          }
        }
      }
    }
  });

  execFileSync(
    "node",
    [SCRIPT, "--root-dir", rootDir, "--plist-file", plistPath, "--skip-launchctl", "--no-restart"],
    { encoding: "utf8" }
  );

  const plist = readPlistJson(plistPath);
  assert.equal(plist.EnvironmentVariables.PATH, "/usr/bin:/bin");
  assert.equal(plist.EnvironmentVariables.OPENCLAW_GATEWAY_TOKEN, "token-123");
  assert.equal(plist.EnvironmentVariables.FEISHU_LAOJUN_APP_SECRET, "secret-laojun");
  assert.equal(plist.EnvironmentVariables.FEISHU_WUKONG_APP_SECRET, "secret-wukong");
});
