#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const HOME = os.homedir();
const ROOT = process.env.OPENCLAW_ROOT || path.join(HOME, ".openclaw");
const DATA_ROOT = process.env.OPENCLAW_DATA_ROOT || path.join(HOME, "Documents", "OpenClawData");
const REGISTRY_PATH = path.join(ROOT, "ops", "project-registry.json");
const CONFIG_PATH = path.join(ROOT, "openclaw.json");
const SYNC_WORKSPACE_SCRIPT = path.join(__dirname, "sync-agent-workspace.js");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function isNonEmptyDir(dirPath) {
  return fs.existsSync(dirPath) && fs.readdirSync(dirPath).length > 0;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    groupId: "",
    projectName: "",
    owner: "laojun",
    ownerUserId: "",
    projectRoot: "",
    sourceMode: "new",
    gitRemote: "",
    spec: "",
    topic: "",
    dryRun: false
  };
  const positional = [];

  while (args.length) {
    const current = args.shift();
    if (current === "--group-id") {
      options.groupId = args.shift() || "";
      continue;
    }
    if (current === "--project-name") {
      options.projectName = args.shift() || "";
      continue;
    }
    if (current === "--owner") {
      options.owner = args.shift() || "laojun";
      continue;
    }
    if (current === "--owner-user-id") {
      options.ownerUserId = args.shift() || "";
      continue;
    }
    if (current === "--project-root") {
      options.projectRoot = args.shift() || "";
      continue;
    }
    if (current === "--source-mode") {
      options.sourceMode = args.shift() || "";
      continue;
    }
    if (current === "--git-remote") {
      options.gitRemote = args.shift() || "";
      continue;
    }
    if (current === "--spec") {
      options.spec = args.shift() || "";
      continue;
    }
    if (current === "--topic") {
      options.topic = args.shift() || "";
      continue;
    }
    if (current === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    positional.push(current);
  }

  const rawProjectId = positional[0] || "";
  if (!rawProjectId) {
    fail("Usage: node scripts/create-project-agent.js <projectId> [--project-name <name>] [--group-id <id>] [--owner <agentId>] [--owner-user-id <feishuUserId>] [--project-root <path>] [--source-mode <new|existing>] [--git-remote <url>] [--spec <name>] [--topic <name>] [--dry-run]");
  }

  const projectId = slugify(rawProjectId);
  if (!projectId) fail("Invalid projectId");

  const sourceMode = options.sourceMode || "new";
  if (!["new", "existing", "existing-local"].includes(sourceMode)) {
    fail("sourceMode must be one of: new, existing, existing-local");
  }
  if (sourceMode === "existing" && !options.gitRemote) {
    fail("Existing projects require --git-remote");
  }

  return {
    projectId,
    projectName: options.projectName || rawProjectId,
    groupId: options.groupId,
    owner: options.owner,
    ownerUserId: options.ownerUserId,
    projectRoot: options.projectRoot,
    sourceMode,
    gitRemote: options.gitRemote,
    spec: slugify(options.spec),
    topic: slugify(options.topic),
    dryRun: options.dryRun
  };
}

function createProjectFiles(projectId, projectName, projectRoot) {
  const files = {
    "agent/AGENTS.md": `# AGENTS.md - ${projectName} 项目维护 Agent

## 定位
你是 \`${projectId}\` 的项目专属维护 Agent。
你只负责这个项目的上下文、工件、推进、验收和风险收口。

## 核心职责
1. 维护本项目的 docs、spec、plan、decision、risk、design brief、delivery state 等工件。
2. 接收首席产品官转交的产品任务包，并锁定到本项目上下文。
3. 凡属软件工程、产品设计、Agent 设计、流程建设任务，默认采用 \`Spec-kit + OpenSpec + Superpowers + XP\`。
4. 若任务尚未明确选择 workflow，先按任务性质二选一：
   - 新能力、新流程、新 Agent、新子系统 -> \`spec-kit-workflow\`
   - 既有系统变更、重构、迁移、兼容性调整 -> \`openspec-workflow\`
5. workflow 选定后，再把架构、设计、实现、审查任务转给共享专家。
6. 负责项目内协调、批次 checkpoint、验收和回写，并向首席产品官汇总结果。
7. 大任务默认先拆模块、目录和文件清单，再逐文件推进；禁止一次性生成或写入巨大单文件。
8. 长任务必须按批次执行；每一批开始、完成、失败都要即时汇报，不得在回合末尾集中输出一串状态。
9. 共享专家失败时，先升级风险与待确认项，不让首席产品官兜底写文件。

## 路由原则
1. 架构设计、技术选型、边界划分 -> \`architect\`（direct acpx：\`/Users/claw/.openclaw/scripts/acpx-architect.sh\`）
2. UI/UX、页面设计、原型制作、Figma 实现 -> \`uiux-designer\`（direct acpx：\`/Users/claw/.openclaw/scripts/acpx-uiux.sh\`）
3. 实现、联调、脚本排查、配置修改 -> \`fullstack-engineer\`（direct acpx：\`/Users/claw/.openclaw/scripts/acpx-fullstack.sh\`）
4. 代码审查、回归风险、测试缺口 -> \`reviewer\`（direct acpx：\`/Users/claw/.openclaw/scripts/acpx-reviewer.sh\`）
5. 不得用 \`sessions_spawn\` 或通用 subagent 替代共享专家。
6. Claude ACP 链路不可用，或需要更稳的底层工程执行时 -> \`Codex\`

## 边界
1. 只服务 \`${projectId}\`。
2. 默认只准备变更，不自动提交、不自动 push。
3. 需要人类拍板时，必须列出待决策项。

## 输出要求
1. 先给当前状态。
2. 再给已处理工件、下一步、负责人。
3. 最后给风险与待确认事项。
`,
    "agent/BOOTSTRAP.md": `# BOOTSTRAP.md - ${projectName} 项目维护硬规则

## 身份硬约束

1. 你是 \`${projectId}\` 的项目专属维护 Agent。
2. 你不是首席产品官，也不是通用个人助理。
3. 你只维护当前项目，不处理其他项目事务。

## 首轮处理硬规则

1. 先确认当前任务属于 \`${projectId}\`。
2. 凡属软件工程、产品设计、Agent 设计、流程建设任务，默认采用 \`Spec-kit + OpenSpec + Superpowers + XP\`。
3. 若用户未明确选 workflow，首轮先完成二选一：
   - 新建类 -> \`spec-kit-workflow\`
   - 变更类 -> \`openspec-workflow\`
4. workflow 未选定前，不进入详细计划、实现或评审分派。
5. 大型交付必须先拆模块和文件清单，再逐文件落地；禁止一次性生成或写入巨大单文件。
6. 你是项目内协调中枢：默认由你负责项目内 checkpoint、验收、回写；项目产物由对应专家或你按规则落地。
7. 长任务按批次推进；每一批开始、完成、失败都要即时汇报。

## 路由硬规则

1. 架构设计、技术选型、边界划分、迁移方案，转 \`architect\`，默认执行 \`/Users/claw/.openclaw/scripts/acpx-architect.sh\`。
2. UI/UX、页面设计、原型制作、Figma 实现，转 \`uiux-designer\`，默认执行 \`/Users/claw/.openclaw/scripts/acpx-uiux.sh\`。
3. 实现、联调、脚本排查、配置修改、工程调试，转 \`fullstack-engineer\`，默认执行 \`/Users/claw/.openclaw/scripts/acpx-fullstack.sh\`。
4. 代码审查、回归检查、测试缺口盘点，转 \`reviewer\`，默认执行 \`/Users/claw/.openclaw/scripts/acpx-reviewer.sh\`。
5. 不得用 \`sessions_spawn\`、generic \`claude\`、或通用 subagent 替代共享专家。
6. Claude ACP 链路不可用，或需要更稳的底层工程执行时，才转 \`Codex\`。
7. 派发每一批专家任务前先即时汇报；批次完成后先验收文件，再即时汇报结果。
`,
    "agent/IDENTITY.md": `# IDENTITY.md - ${projectName} 项目维护 Agent

- **Name:** ${projectName} 项目维护 Agent
- **Agent ID:** ${projectId}
- **Role:** 项目专属维护 Agent / 项目内协调中枢
- **Persona:** 边界清晰、重工件、重收口的项目维护者，只服务单一项目。
- **Vibe:** 稳、准、直接。
- **Strengths:** 项目上下文维护、工件回写、任务路由、验收收口、风险升级。
- **Service Scope:** 仅维护 \`${projectId}\`。
- **Channel Owner:** 默认不直接绑定飞书，对外由首席产品官代理。
`,
    "agent/SOUL.md": `# SOUL.md - ${projectName} 项目维护 Agent

## Background
你是单项目维护 Agent。你的价值在于保持项目上下文稳定、工件完整、推进链条清晰。

## Goals
1. 严格维护 \`${projectId}\` 的上下文边界。
2. 先选对 workflow，再推进执行。
3. 让每个任务都有状态、负责人、验收与风险口径。
4. 把首席产品官的产品判断沉淀成项目工件，并稳定调度共享专家。

## Constraints
1. 不混入其他项目上下文。
2. 不在 workflow 未确定前展开大方案。
3. 不抢做首席产品官的对人职责。
`,
    "agent/USER.md": `# USER.md - ${projectName} 项目维护 Agent 的服务对象

- **Primary User:** claw
- **How To Address:** 你
- **Timezone:** Asia/Shanghai
- **Language:** zh-CN
- **Notes:** 默认通过首席产品官接任务，也可在仓库内直接维护项目工件。
`,
    "agent/HEARTBEAT.md": "# HEARTBEAT.md\n\n# 留空表示默认不启用周期心跳任务。\n",
    "agent/MEMORY.md": `# MEMORY.md - ${projectName} 项目维护 Agent 的长期记忆

- 你只服务 \`${projectId}\`
- 用户未选 workflow 时，必须先在 \`Spec-kit\` 与 \`OpenSpec\` 中二选一
- 项目上下文以本项目工件和注册表为准
- 设计执行默认外包给 \`uiux-designer\`
- 专业执行默认外包给 \`architect\`、\`fullstack-engineer\`、\`reviewer\`
- 大任务默认拆模块、拆文件、分步验证；禁止“一次性大文件一把梭”
- 你负责项目内协调、验收、回写和风险升级
- 长任务按批次推进，每批即时回报，不把状态积压到回合末尾
- 对外汇报时，先状态，再下一步，再风险
`,
    "agent/TOOLS.md": `# TOOLS.md - ${projectName} 项目维护 Agent 的本地工具备注

## 常用资源
- 首席产品官：\`laojun\`
- 架构 Agent：\`architect\`
- UI/UX Agent：\`uiux-designer\`
- 工程 Agent：\`fullstack-engineer\`
- 审查 Agent：\`reviewer\`
- 底层工程兜底：Codex
- direct acpx 入口：\`architect\` -> \`/Users/claw/.openclaw/scripts/acpx-architect.sh\`，\`uiux-designer\` -> \`/Users/claw/.openclaw/scripts/acpx-uiux.sh\`，\`fullstack-engineer\` -> \`/Users/claw/.openclaw/scripts/acpx-fullstack.sh\`，\`reviewer\` -> \`/Users/claw/.openclaw/scripts/acpx-reviewer.sh\`

## 特殊工具
- 项目内工件维护、推进、验收收口与批次状态，由你负责。
- 专业任务默认转给共享专家 Agent。
- 界面、交互、原型、设计图任务默认转给 \`uiux-designer\`。
- 禁止用 \`sessions_spawn\`、generic \`claude\`、或通用 subagent 替代共享专家。
- 大任务默认先拆模块和文件清单，再逐文件落地；禁止一次性生成或写入巨大单文件。
- 项目内协调由你负责；长任务按批次推进，并在每批开始、完成、失败时即时汇报。
- Claude ACP 不可用或需要更稳的仓库执行时，再转 Codex。
`,
    "agent/auth-profiles.json": '{\n  "version": 1,\n  "profiles": {\n    "anthropic-proxy:default": {\n      "type": "api_key",\n      "provider": "anthropic-proxy",\n      "key": "sk-5s9Vt3xtEt8uXrxqHND6ow"\n    },\n    "openai-codex:default": {\n      "useDefault": true\n    }\n  },\n  "lastGood": {\n    "anthropic-proxy": "anthropic-proxy:default"\n  }\n}\n',
    "agent/models.json": '{\n  "providers": {\n    "anthropic-proxy": {\n      "baseUrl": "https://ai-llm-proxy.tarstech.com",\n      "api": "anthropic-messages",\n      "auth": "api-key",\n      "apiKey": "secretref-managed",\n      "models": [\n        {\n          "id": "claude-opus-4-6",\n          "name": "Claude Opus 4.6",\n          "reasoning": true,\n          "input": [\n            "text"\n          ],\n          "contextWindow": 200000,\n          "maxTokens": 8192\n        }\n      ]\n    },\n    "openai-codex": {\n      "useDefault": true\n    }\n  }\n}\n',
    "agent/skills.json": JSON.stringify({
      skills: [
        "find-skills",
        "summarize",
        "spec-kit-workflow",
        "openspec-workflow",
        "extreme-programming"
      ]
    }, null, 2) + "\n"
  };

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(projectRoot, relativePath);
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
  }
}

function ensureProjectDocs(projectId, projectRoot) {
  const docsRoot = path.join(projectRoot, "docs");
  ensureDir(docsRoot);
  ensureDir(path.join(docsRoot, "design"));
  ensureDir(path.join(projectRoot, "design"));
  ensureDir(path.join(projectRoot, "prototype"));

  const docs = {
    "index.md": `# ${projectId} 项目索引

- [prd.md](prd.md)
- [roadmap.md](roadmap.md)
- [current-iteration.md](current-iteration.md)
- [decisions.md](decisions.md)
- [risks.md](risks.md)
`,
    "prd.md": `# ${projectId} PRD

## Goal

## Scope

## Non-goals

## Acceptance
`,
    "roadmap.md": `# ${projectId} Roadmap

## Now

## Next

## Later
`,
    "current-iteration.md": `# ${projectId} Current Iteration

## Current Goal

## In Progress

## Blockers
`,
    "delivery-state.md": `# ${projectId} Delivery State

## Active Batch

## Last Completed Batch

## Pending Batches

## Blocking Issues
`,
    "task-package.md": `# ${projectId} Product Task Package

## Goal

## Workflow

## Scope

## Acceptance

## Constraints

## Open Questions
`,
    "decisions.md": `# ${projectId} Decisions
`,
    "risks.md": `# ${projectId} Risks
`,
    "design/README.md": `# ${projectId} Design Notes

- 在这里记录页面目标、风格方向、设计说明、截图索引与待确认项。
`
  };

  for (const [name, content] of Object.entries(docs)) {
    const filePath = path.join(docsRoot, name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
    }
  }

  const topLevelFiles = {
    "design/README.md": `# ${projectId} Design Assets

- 放设计源文件、导出的素材、Figma 对应说明。
`,
    "prototype/README.md": `# ${projectId} Interactive Prototype

- 放可交互原型、页面快照、演示入口。
`
  };

  for (const [name, content] of Object.entries(topLevelFiles)) {
    const filePath = path.join(projectRoot, name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
    }
  }
}

function updateRegistry(record) {
  ensureDir(path.dirname(REGISTRY_PATH));
  const registry = fs.existsSync(REGISTRY_PATH)
    ? readJson(REGISTRY_PATH)
    : { version: 1, projects: {} };

  registry.projects[record.projectId] = {
    ...(registry.projects[record.projectId] || {}),
    ...record
  };
  writeJson(REGISTRY_PATH, registry);
}

function updateOpenClaw(agentEntry) {
  const config = readJson(CONFIG_PATH);
  const list = config.agents?.list || [];
  const index = list.findIndex((agent) => agent.id === agentEntry.id);
  if (index === -1) {
    list.push(agentEntry);
  } else {
    list[index] = {
      ...list[index],
      ...agentEntry
    };
  }

  config.agents = config.agents || {};
  config.agents.list = list;

  const feishu = config.channels?.feishu;
  const feishuAccount = feishu?.accounts?.[agentEntry.owner] || feishu;
  if (feishuAccount && agentEntry.groupId) {
    const allow = new Set(feishuAccount.groupAllowFrom || []);
    allow.add(agentEntry.groupId);
    feishuAccount.groupAllowFrom = Array.from(allow);
    if (!feishuAccount.groupPolicy) {
      feishuAccount.groupPolicy = "allowlist";
    }
    if (feishuAccount.requireMention === undefined) {
      feishuAccount.requireMention = true;
    }

    const groups = feishuAccount.groups || {};
    const groupConfig = groups[agentEntry.groupId] || {};
    groupConfig.requireMention = false;
    if (agentEntry.ownerUserId) {
      const allowFrom = new Set(groupConfig.allowFrom || []);
      allowFrom.add(agentEntry.ownerUserId);
      groupConfig.allowFrom = Array.from(allowFrom);
    }
    groups[agentEntry.groupId] = groupConfig;
    feishuAccount.groups = groups;
  }

  writeJson(CONFIG_PATH, config);
}

function ensureRuntimeDirs(runtimeRoot) {
  for (const dir of ["workspace", "sessions", "users", path.join("logs", "security")]) {
    ensureDir(path.join(runtimeRoot, dir));
  }
}

function inferVcsProvider(gitRemote) {
  if (!gitRemote) return "none";
  const internalGitlabHost = process.env.OPENCLAW_TEST_GITLAB_HOST || "git.tarsocial.com";
  if (gitRemote.includes("github.com")) return "github";
  if (gitRemote.includes("git.tarsocial.com") || gitRemote.includes(internalGitlabHost)) {
    return "gitlab-internal";
  }
  return "generic-git";
}

function branchNameFor(provider, spec, topic) {
  if (!spec || !topic) return "";
  const suffix = `${spec}-${topic}`;
  if (provider === "gitlab-internal") {
    return `feature/${suffix}`;
  }
  return `codex/${suffix}`;
}

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    ...options
  });
  if (result.status !== 0) {
    fail(result.stderr || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function detectDefaultBranch(repoDir) {
  const ref = git(["-C", repoDir, "symbolic-ref", "refs/remotes/origin/HEAD"]);
  return ref.replace("refs/remotes/origin/", "");
}

function ensureGitRemoteState(projectRoot, gitRemote, branchName) {
  if (!fs.existsSync(projectRoot)) {
    git(["clone", gitRemote, projectRoot]);
  } else if (!fs.existsSync(path.join(projectRoot, ".git"))) {
    if (isNonEmptyDir(projectRoot)) {
      fail(`Project root exists but is not a git repository: ${projectRoot}`);
    }
    git(["clone", gitRemote, projectRoot]);
  }

  const remotes = git(["-C", projectRoot, "remote"]).split(/\s+/).filter(Boolean);
  if (!remotes.includes("upstream")) {
    git(["-C", projectRoot, "remote", "add", "upstream", gitRemote]);
  }

  const defaultBranch = detectDefaultBranch(projectRoot);
  git(["-C", projectRoot, "checkout", defaultBranch]);
  git(["-C", projectRoot, "pull", "origin", defaultBranch]);

  if (branchName) {
    git(["-C", projectRoot, "checkout", "-B", branchName]);
    git(["-C", projectRoot, "branch", "--set-upstream-to", `origin/${defaultBranch}`, branchName]);
  }
}

function syncWorkspace(projectId) {
  const result = spawnSync("node", [SYNC_WORKSPACE_SCRIPT, projectId], {
    stdio: "inherit",
    env: process.env
  });
  if (result.status !== 0) {
    fail(`Failed to sync workspace for ${projectId}`);
  }
}

function buildProjectPaths(projectId, explicitRoot) {
  const projectRoot = explicitRoot || path.join(DATA_ROOT, "projects", projectId);
  const runtimeRoot = path.join(projectRoot, ".runtime", "openclaw");
  return {
    projectRoot,
    runtimeRoot,
    workspace: path.join(runtimeRoot, "workspace"),
    agentDir: path.join(projectRoot, "agent")
  };
}

function buildRecord(fields) {
  return {
    ...fields,
    agentId: fields.projectId,
    status: "active",
    kind: "project",
    createdAt: new Date().toISOString()
  };
}

function buildDryRunPayload(fields) {
  const {
    projectId,
    projectName,
    groupId,
    owner,
    ownerUserId,
    projectRoot,
    runtimeRoot,
    sourceMode,
    gitRemote,
    vcsProvider,
    branchName
  } = fields;

  return {
    projectId,
    projectName,
    groupId,
    owner,
    ownerUserId,
    projectRoot,
    runtimeRoot,
    sourceMode,
    gitRemote,
    vcsProvider,
    branchName,
    actions: [
      `create ${projectRoot}/agent/ (including skills.json)`,
      `create ${projectRoot}/docs/`,
      `create runtime ${runtimeRoot}/`,
      "update ops/project-registry.json",
      "update openclaw.json agents.list",
      ...(sourceMode === "existing"
        ? [
            "clone git remote into project root",
            `create branch ${branchName}`,
            "configure upstream remote"
          ]
        : sourceMode === "existing-local"
          ? ["bootstrap existing local project in place"]
          : []),
      ...(groupId ? [
        `append channels.feishu.accounts.${owner}.groupAllowFrom <- ${groupId}`,
        `set channels.feishu.accounts.${owner}.groups.${groupId}.requireMention = false`,
        ...(ownerUserId ? [`append channels.feishu.accounts.${owner}.groups.${groupId}.allowFrom <- ${ownerUserId}`] : [])
      ] : []),
      `sync workspace for ${projectId}`
    ]
  };
}

function main() {
  const {
    projectId,
    projectName,
    groupId,
    owner,
    ownerUserId,
    projectRoot: explicitProjectRoot,
    sourceMode,
    gitRemote,
    spec,
    topic,
    dryRun
  } = parseArgs(process.argv.slice(2));

  const { projectRoot, runtimeRoot, workspace, agentDir } = buildProjectPaths(projectId, explicitProjectRoot);
  const vcsProvider = inferVcsProvider(gitRemote);
  const branchName = branchNameFor(vcsProvider, spec, topic);

  if (sourceMode === "existing" && !branchName) {
    fail("Existing projects require --spec and --topic to create a working branch");
  }

  if (sourceMode === "new" && isNonEmptyDir(projectRoot)) {
    fail(`Project root already exists: ${projectRoot}`);
  }
  if ((sourceMode === "existing" || sourceMode === "existing-local") && fs.existsSync(path.join(projectRoot, "agent", "AGENTS.md"))) {
    fail(`Project agent already exists: ${projectId}`);
  }
  if (sourceMode === "existing-local" && !isNonEmptyDir(projectRoot)) {
    fail(`Existing-local projects require a non-empty project root: ${projectRoot}`);
  }

  const record = buildRecord({
    projectId,
    projectName,
    groupId,
    owner,
    ownerUserId,
    workspace,
    agentDir,
    projectRoot,
    runtimeRoot,
    sourceMode,
    gitRemote,
    vcsProvider,
    branchName
  });

  if (dryRun) {
    console.log(JSON.stringify(buildDryRunPayload(record), null, 2));
    return;
  }

  if (sourceMode === "existing") {
    ensureGitRemoteState(projectRoot, gitRemote, branchName);
  } else if (sourceMode === "new") {
    ensureDir(projectRoot);
  }

  createProjectFiles(projectId, projectName, projectRoot);
  ensureProjectDocs(projectId, projectRoot);
  ensureRuntimeDirs(runtimeRoot);
  updateRegistry(record);
  updateOpenClaw({
    id: projectId,
    workspace,
    agentDir
  });

  syncWorkspace(projectId);
  console.log(`Created project agent: ${projectId}`);
  if (groupId) {
    console.log(`Feishu group enabled: ${groupId} -> requireMention=false`);
    if (ownerUserId) {
      console.log(`Feishu group owner allowFrom: ${ownerUserId}`);
    }
    console.log("Next: restart gateway or wait for config hot reload, then send a fresh group message for smoke test.");
  }
}

main();
