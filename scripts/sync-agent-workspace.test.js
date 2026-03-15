const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "sync-agent-workspace.js");

function makeTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-sync-workspace-test-"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function listDirNames(dirPath) {
  return fs.readdirSync(dirPath).sort();
}

test("syncs minimal skill white lists for wukong guanyin and taibai", () => {
  const homeDir = makeTempHome();
  const rootDir = path.join(homeDir, ".openclaw");
  const dataRoot = path.join(homeDir, "Documents", "OpenClawData");

  writeJson(path.join(rootDir, "openclaw.json"), {
    agents: {
      list: [
        { id: "wukong" },
        { id: "guanyin" },
        { id: "taibai" }
      ]
    }
  });

  for (const agentId of ["wukong", "guanyin", "taibai"]) {
    writeFile(path.join(rootDir, "agents", agentId, "AGENTS.md"), `# ${agentId}\n`);
  }
  writeFile(path.join(rootDir, "docs", "agents", "shared-safety-charter.md"), "# safety\n");

  for (const skillName of [
    "find-skills",
    "summarize",
    "trade-operations-workflow",
    "feishu-doc",
    "trade-ops-assistant",
    "trade-quote-layout",
    "trade-quotation-template"
  ]) {
    writeFile(path.join(rootDir, "core", "skills", skillName, "SKILL.md"), `# ${skillName}\n`);
  }

  const result = spawnSync("node", [SCRIPT, "wukong", "guanyin", "taibai"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: homeDir
    }
  });

  assert.equal(result.status, 0, result.stderr);

  assert.deepEqual(
    listDirNames(path.join(dataRoot, "agents", "wukong", "workspace", "skills")),
    ["find-skills"]
  );
  assert.deepEqual(
    listDirNames(path.join(dataRoot, "agents", "guanyin", "workspace", "skills")),
    []
  );
  assert.deepEqual(
    listDirNames(path.join(dataRoot, "agents", "taibai", "workspace", "skills")),
    ["trade-operations-workflow"]
  );
});

test("syncs laojun without UI delivery skills", () => {
  const homeDir = makeTempHome();
  const rootDir = path.join(homeDir, ".openclaw");
  const dataRoot = path.join(homeDir, "Documents", "OpenClawData");

  writeJson(path.join(rootDir, "openclaw.json"), {
    agents: {
      list: [
        { id: "laojun" }
      ]
    }
  });

  writeFile(path.join(rootDir, "agents", "laojun", "AGENTS.md"), "# laojun\n");
  writeFile(path.join(rootDir, "docs", "agents", "shared-safety-charter.md"), "# safety\n");

  for (const skillName of [
    "find-skills",
    "summarize",
    "spec-kit-workflow",
    "openspec-workflow",
    "extreme-programming"
  ]) {
    writeFile(path.join(rootDir, "core", "skills", skillName, "SKILL.md"), `# ${skillName}\n`);
  }
  const result = spawnSync("node", [SCRIPT, "laojun"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: homeDir
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    listDirNames(path.join(dataRoot, "agents", "laojun", "workspace", "skills")),
    [
      "extreme-programming",
      "find-skills",
      "openspec-workflow",
      "spec-kit-workflow",
      "summarize"
    ]
  );
});

test("syncs project agents with default project skillset", () => {
  const homeDir = makeTempHome();
  const rootDir = path.join(homeDir, ".openclaw");
  const dataRoot = path.join(homeDir, "Documents", "OpenClawData");
  const projectRoot = path.join(homeDir, "Documents", "OpenClawData", "projects", "alpha");

  writeJson(path.join(rootDir, "openclaw.json"), {
    agents: {
      list: [
        {
          id: "alpha",
          workspace: path.join(projectRoot, ".runtime", "openclaw", "workspace"),
          agentDir: path.join(projectRoot, "agent")
        }
      ]
    }
  });

  writeFile(path.join(projectRoot, "agent", "AGENTS.md"), "# alpha\n");
  writeFile(path.join(rootDir, "docs", "agents", "shared-safety-charter.md"), "# safety\n");

  for (const skillName of [
    "find-skills",
    "summarize",
    "spec-kit-workflow",
    "openspec-workflow",
    "extreme-programming"
  ]) {
    writeFile(path.join(rootDir, "core", "skills", skillName, "SKILL.md"), `# ${skillName}\n`);
  }

  const result = spawnSync("node", [SCRIPT, "alpha"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: homeDir
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    listDirNames(path.join(projectRoot, ".runtime", "openclaw", "workspace", "skills")),
    [
      "extreme-programming",
      "find-skills",
      "openspec-workflow",
      "spec-kit-workflow",
      "summarize"
    ]
  );
});
