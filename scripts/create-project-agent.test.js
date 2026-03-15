const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "create-project-agent.js");

function makeTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-project-agent-test-"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function runNode(args, options = {}) {
  return spawnSync("node", [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    ...options
  });
}

function initRepoRoot(homeDir) {
  const rootDir = path.join(homeDir, ".openclaw");
  writeJson(path.join(rootDir, "openclaw.json"), {
    agents: {
      list: [
        {
          id: "laojun",
          workspace: path.join(homeDir, "Documents", "OpenClawData", "agents", "laojun", "workspace"),
          agentDir: path.join(rootDir, "agents", "laojun", "agent")
        }
      ]
    },
    channels: {
      feishu: {
        accounts: {
          laojun: {
            groupPolicy: "allowlist",
            groupAllowFrom: [],
            groups: {}
          }
        }
      }
    }
  });
  writeJson(path.join(rootDir, "ops", "project-registry.json"), {
    version: 1,
    projects: {}
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

  return rootDir;
}

function initBareRepo(bareRepoPath, seedBranch = "main") {
  fs.mkdirSync(path.dirname(bareRepoPath), { recursive: true });
  spawnSync("git", ["init", "--bare", bareRepoPath], { encoding: "utf8" });

  const workTree = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-project-agent-seed-"));
  spawnSync("git", ["clone", bareRepoPath, workTree], { encoding: "utf8" });
  spawnSync("git", ["-C", workTree, "config", "user.name", "Codex Test"], { encoding: "utf8" });
  spawnSync("git", ["-C", workTree, "config", "user.email", "codex@example.com"], { encoding: "utf8" });
  writeFile(path.join(workTree, "README.md"), "# test\n");
  spawnSync("git", ["-C", workTree, "add", "README.md"], { encoding: "utf8" });
  spawnSync("git", ["-C", workTree, "commit", "-m", "seed"], { encoding: "utf8" });
  spawnSync("git", ["-C", workTree, "branch", "-M", seedBranch], { encoding: "utf8" });
  spawnSync("git", ["-C", workTree, "push", "origin", seedBranch], { encoding: "utf8" });
}

test("dry-run reports externalized project paths and git setup for existing gitlab projects", () => {
  const homeDir = makeTempHome();
  initRepoRoot(homeDir);

  const result = runNode(
    [
      "alpha",
      "--project-name",
      "Alpha 项目",
      "--group-id",
      "oc_test",
      "--owner",
      "laojun",
      "--owner-user-id",
      "ou_test",
      "--source-mode",
      "existing",
      "--git-remote",
      "git@git.tarsocial.com:foo/bar.git",
      "--spec",
      "trade",
      "--topic",
      "bootstrap",
      "--dry-run"
    ],
    {
      env: {
        ...process.env,
        HOME: homeDir
      }
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(
    payload.projectRoot,
    path.join(homeDir, "Documents", "OpenClawData", "projects", "alpha")
  );
  assert.equal(payload.sourceMode, "existing");
  assert.equal(payload.vcsProvider, "gitlab-internal");
  assert.equal(payload.branchName, "feature/trade-bootstrap");
  assert.ok(payload.actions.includes("clone git remote into project root"));
  assert.ok(payload.actions.includes("create branch feature/trade-bootstrap"));
  assert.ok(payload.actions.includes("configure upstream remote"));
  assert.ok(
    payload.actions.includes("append channels.feishu.accounts.laojun.groupAllowFrom <- oc_test")
  );
});

test("creates a new project under externalized project root with externalized runtime", () => {
  const homeDir = makeTempHome();
  const rootDir = initRepoRoot(homeDir);

  const result = runNode(
    [
      "alpha",
      "--project-name",
      "Alpha 项目",
      "--group-id",
      "oc_test",
      "--owner",
      "laojun",
      "--owner-user-id",
      "ou_test"
    ],
    {
      env: {
        ...process.env,
        HOME: homeDir
      }
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const projectRoot = path.join(homeDir, "Documents", "OpenClawData", "projects", "alpha");
  const runtimeRoot = path.join(projectRoot, ".runtime", "openclaw");
  const registry = readJson(path.join(rootDir, "ops", "project-registry.json"));
  const project = registry.projects.alpha;
  const toolsContent = fs.readFileSync(path.join(projectRoot, "agent", "TOOLS.md"), "utf8");
  const agentsContent = fs.readFileSync(path.join(projectRoot, "agent", "AGENTS.md"), "utf8");
  const models = readJson(path.join(projectRoot, "agent", "models.json"));
  const authProfiles = readJson(path.join(projectRoot, "agent", "auth-profiles.json"));
  const skillsDir = path.join(runtimeRoot, "workspace", "skills");

  assert.equal(project.projectRoot, projectRoot);
  assert.equal(project.runtimeRoot, runtimeRoot);
  assert.equal(project.agentDir, path.join(projectRoot, "agent"));
  assert.equal(project.workspace, path.join(runtimeRoot, "workspace"));
  assert.equal(project.sourceMode, "new");
  assert.equal(project.gitRemote, "");
  assert.equal(project.vcsProvider, "none");
  assert.equal(project.branchName, "");
  assert.ok(fs.existsSync(path.join(projectRoot, "agent", "AGENTS.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, "docs", "prd.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, "docs", "delivery-state.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, "docs", "task-package.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, "docs", "design", "README.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, "design", "README.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, "prototype", "README.md")));
  assert.ok(fs.existsSync(path.join(runtimeRoot, "workspace", "AGENTS.md")));
  assert.deepEqual(fs.readdirSync(skillsDir).sort(), [
    "extreme-programming",
    "find-skills",
    "openspec-workflow",
    "spec-kit-workflow",
    "summarize"
  ]);

  const config = readJson(path.join(rootDir, "openclaw.json"));
  const agent = config.agents.list.find((item) => item.id === "alpha");
  assert.equal(agent.agentDir, path.join(projectRoot, "agent"));
  assert.equal(agent.workspace, path.join(runtimeRoot, "workspace"));
  assert.match(toolsContent, /UI\/UX Agent：`uiux-designer`/);
  assert.match(toolsContent, /专业任务默认转给共享专家 Agent/);
  assert.match(agentsContent, /UI\/UX、页面设计、原型制作、Figma 实现 -> `uiux-designer`/);
  assert.equal(models.providers["anthropic-proxy"].baseUrl, "https://ai-llm-proxy.tarstech.com");
  assert.equal(authProfiles.profiles["anthropic-proxy:default"].provider, "anthropic-proxy");
});

test("bootstraps an existing local project in place", () => {
  const homeDir = makeTempHome();
  const rootDir = initRepoRoot(homeDir);
  const projectRoot = path.join(homeDir, "Documents", "OpenClawData", "projects", "alpha");

  writeFile(path.join(projectRoot, "README.md"), "# alpha\n");
  writeFile(path.join(projectRoot, ".git", "HEAD"), "ref: refs/heads/main\n");

  const result = runNode(
    [
      "alpha",
      "--project-name",
      "Alpha 项目",
      "--source-mode",
      "existing-local"
    ],
    {
      env: {
        ...process.env,
        HOME: homeDir
      }
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const registry = readJson(path.join(rootDir, "ops", "project-registry.json"));
  const config = readJson(path.join(rootDir, "openclaw.json"));
  const agent = config.agents.list.find((item) => item.id === "alpha");

  assert.equal(registry.projects.alpha.sourceMode, "existing-local");
  assert.ok(fs.existsSync(path.join(projectRoot, "agent", "AGENTS.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".runtime", "openclaw", "workspace", "AGENTS.md")));
});

test("clones existing gitlab project, creates compliant branch, and records git metadata", () => {
  const homeDir = makeTempHome();
  const rootDir = initRepoRoot(homeDir);
  const bareRepoPath = path.join(homeDir, "remotes", "git.tarsocial.com", "foo", "bar.git");
  initBareRepo(bareRepoPath);

  const result = runNode(
    [
      "alpha",
      "--project-name",
      "Alpha 项目",
      "--source-mode",
      "existing",
      "--git-remote",
      bareRepoPath,
      "--spec",
      "trade",
      "--topic",
      "bootstrap"
    ],
    {
      env: {
        ...process.env,
        HOME: homeDir,
        OPENCLAW_TEST_GITLAB_HOST: bareRepoPath
      }
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const projectRoot = path.join(homeDir, "Documents", "OpenClawData", "projects", "alpha");
  const branchName = spawnSync("git", ["-C", projectRoot, "branch", "--show-current"], {
    encoding: "utf8"
  }).stdout.trim();
  const upstreamUrl = spawnSync("git", ["-C", projectRoot, "remote", "get-url", "upstream"], {
    encoding: "utf8"
  }).stdout.trim();
  const registry = readJson(path.join(rootDir, "ops", "project-registry.json"));

  assert.equal(branchName, "feature/trade-bootstrap");
  assert.equal(upstreamUrl, bareRepoPath);
  assert.equal(registry.projects.alpha.gitRemote, bareRepoPath);
  assert.equal(registry.projects.alpha.sourceMode, "existing");
  assert.equal(registry.projects.alpha.vcsProvider, "gitlab-internal");
  assert.equal(registry.projects.alpha.branchName, "feature/trade-bootstrap");
});
