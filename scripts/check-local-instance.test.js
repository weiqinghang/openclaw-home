const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "check-local-instance.js");

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-check-test-"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

test("fails when required files are missing", () => {
  const rootDir = makeTempRoot();
  const result = spawnSync("node", [SCRIPT, "--root-dir", rootDir], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required file/);
});

test("passes minimal checks for initialized local instance", () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "openclaw.json"), {
    agents: {
      list: [
        {
          id: "wukong"
        }
      ]
    },
    channels: {
      feishu: {
        accounts: {
          wukong: {
            appId: "cli_test",
            appSecret: "${FEISHU_WUKONG_APP_SECRET}"
          }
        }
      }
    }
  });
  writeJson(path.join(rootDir, "secrets.local.json"), {
    runtime: {
      OPENCLAW_GATEWAY_TOKEN: "token"
    },
    providers: {
      "minimax-cn": {
        apiKey: "key"
      }
    },
    channels: {
      feishu: {
        accounts: {
          wukong: {
            appSecret: "secret"
          }
        }
      }
    }
  });

  const result = spawnSync("node", [SCRIPT, "--root-dir", rootDir], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /"status": "ok"/);
  assert.match(result.stdout, /"checksPassed": 5/);
});
