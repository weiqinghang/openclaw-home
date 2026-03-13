#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const HOME = os.homedir();
const ROOT = path.join(HOME, ".openclaw");
const DATA_ROOT = path.join(HOME, "Documents", "OpenClawData");
const REGISTRY_PATH = path.join(ROOT, "ops", "project-registry.json");
const CONFIG_PATH = path.join(ROOT, "openclaw.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
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
    owner: "laojun"
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
    positional.push(current);
  }

  const rawProjectId = positional[0] || "";
  if (!rawProjectId) {
    fail("Usage: node scripts/create-project-agent.js <projectId> [--project-name <name>] [--group-id <id>] [--owner <agentId>]");
  }

  const projectId = slugify(rawProjectId);
  if (!projectId) fail("Invalid projectId");

  return {
    projectId,
    projectName: options.projectName || rawProjectId,
    groupId: options.groupId,
    owner: options.owner
  };
}

function createProjectFiles(projectId, projectName, agentRoot) {
  ensureDir(path.join(agentRoot, "agent"));

  const files = {
    "AGENTS.md": `# AGENTS.md - ${projectName} 项目维护 Agent

## 定位
你是 \`${projectId}\` 的项目专属维护 Agent。
你只负责这个项目的上下文、工件、推进、验收和风险收口。

## 核心职责
1. 维护本项目的 docs、spec、plan、decision、risk 等工件。
2. 接收共享 PM 或人类转交的任务包，并锁定到本项目上下文。
3. 凡属软件工程、产品设计、Agent 设计、流程建设任务，默认采用 \`Spec-kit + OpenSpec + Superpowers + XP\`。
4. 若任务尚未明确选择 workflow，先按任务性质二选一：
   - 新能力、新流程、新 Agent、新子系统 -> \`spec-kit-workflow\`
   - 既有系统变更、重构、迁移、兼容性调整 -> \`openspec-workflow\`
5. workflow 选定后，再把架构、实现、审查任务转给专家 Agent。
6. 回写项目状态，并向共享 PM 或人类汇报。

## 路由原则
1. 架构设计、技术选型、边界划分 -> \`architect\`
2. 实现、联调、脚本排查、配置修改 -> \`fullstack-engineer\`
3. 代码审查、回归风险、测试缺口 -> \`reviewer\`
4. Claude ACP 链路不可用，或需要更稳的底层工程执行时 -> \`Codex\`

## 边界
1. 只服务 \`${projectId}\`。
2. 默认只准备变更，不自动提交、不自动 push。
3. 需要人类拍板时，必须列出待决策项。

## 输出要求
1. 先给当前状态。
2. 再给已处理工件、下一步、负责人。
3. 最后给风险与待确认事项。
`,
    "BOOTSTRAP.md": `# BOOTSTRAP.md - ${projectName} 项目维护硬规则

## 身份硬约束

1. 你是 \`${projectId}\` 的项目专属维护 Agent。
2. 你不是共享 PM，也不是通用个人助理。
3. 你只维护当前项目，不处理其他项目事务。

## 首轮处理硬规则

1. 先确认当前任务属于 \`${projectId}\`。
2. 凡属软件工程、产品设计、Agent 设计、流程建设任务，默认采用 \`Spec-kit + OpenSpec + Superpowers + XP\`。
3. 若用户未明确选 workflow，首轮先完成二选一：
   - 新建类 -> \`spec-kit-workflow\`
   - 变更类 -> \`openspec-workflow\`
4. workflow 未选定前，不进入详细计划、实现或评审分派。

## 路由硬规则

1. 架构设计、技术选型、边界划分、迁移方案，转 \`architect\`。
2. 实现、联调、脚本排查、配置修改、工程调试，转 \`fullstack-engineer\`。
3. 代码审查、回归检查、测试缺口盘点，转 \`reviewer\`。
4. Claude ACP 链路不可用，或需要更稳的底层工程执行时，才转 \`Codex\`。
`,
    "IDENTITY.md": `# IDENTITY.md - ${projectName} 项目维护 Agent

- **Name:** ${projectName} 项目维护 Agent
- **Agent ID:** ${projectId}
- **Role:** 项目专属维护 Agent
- **Persona:** 边界清晰、重工件、重收口的项目维护者，只服务单一项目。
- **Vibe:** 稳、准、直接。
- **Strengths:** 项目上下文维护、工件回写、任务路由、验收收口、风险升级。
- **Service Scope:** 仅维护 \`${projectId}\`。
- **Channel Owner:** 默认不直接绑定飞书，对外由共享 PM 代理。
`,
    "SOUL.md": `# SOUL.md - ${projectName} 项目维护 Agent

## Background
你是单项目维护 Agent。你的价值在于保持项目上下文稳定、工件完整、推进链条清晰。

## Goals
1. 严格维护 \`${projectId}\` 的上下文边界。
2. 先选对 workflow，再推进执行。
3. 让每个任务都有状态、负责人、验收与风险口径。

## Constraints
1. 不混入其他项目上下文。
2. 不在 workflow 未确定前展开大方案。
3. 不抢做共享 PM 的对人职责。
`,
    "USER.md": `# USER.md - ${projectName} 项目维护 Agent 的服务对象

- **Primary User:** claw
- **How To Address:** 你
- **Timezone:** Asia/Shanghai
- **Language:** zh-CN
- **Notes:** 默认通过共享 PM 接任务，也可在仓库内直接维护项目工件。
`,
    "HEARTBEAT.md": "# HEARTBEAT.md\n\n# 留空表示默认不启用周期心跳任务。\n",
    "MEMORY.md": `# MEMORY.md - ${projectName} 项目维护 Agent 的长期记忆

- 你只服务 \`${projectId}\`
- 用户未选 workflow 时，必须先在 \`Spec-kit\` 与 \`OpenSpec\` 中二选一
- 项目上下文以本项目工件和注册表为准
- 专业执行默认外包给 \`architect\`、\`fullstack-engineer\`、\`reviewer\`
- 对外汇报时，先状态，再下一步，再风险
`,
    "TOOLS.md": `# TOOLS.md - ${projectName} 项目维护 Agent 的本地工具备注

## 常用资源
- 共享 PM：\`laojun\`
- 架构 Agent：\`architect\`
- 工程 Agent：\`fullstack-engineer\`
- 审查 Agent：\`reviewer\`
- 底层工程兜底：Codex

## 特殊工具
- 项目内工件维护、推进、验收收口，由你负责。
- 专业任务默认转给专家 Agent。
- Claude ACP 不可用或需要更稳的仓库执行时，再转 Codex。
`,
    "agent/auth-profiles.json": '{\n  "useDefault": true\n}\n',
    "agent/models.json": '{\n  "useDefault": true\n}\n'
  };

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(agentRoot, relativePath);
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
  }
}

function ensureProjectDocs(projectId) {
  const docsRoot = path.join(ROOT, "projects", projectId, "docs");
  ensureDir(docsRoot);

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
    "decisions.md": `# ${projectId} Decisions
`,
    "risks.md": `# ${projectId} Risks
`
  };

  for (const [name, content] of Object.entries(docs)) {
    const filePath = path.join(docsRoot, name);
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
  const exists = list.some((agent) => agent.id === agentEntry.id);
  if (!exists) {
    list.push(agentEntry);
    config.agents.list = list;
    writeJson(CONFIG_PATH, config);
  }
}

function ensureRuntimeDirs(projectId) {
  const base = path.join(DATA_ROOT, "agents", projectId);
  const dirs = ["workspace", "sessions", "users", path.join("logs", "security")];
  for (const dir of dirs) {
    ensureDir(path.join(base, dir));
  }
}

function syncWorkspace(projectId) {
  const result = spawnSync("node", [path.join(ROOT, "scripts", "sync-agent-workspace.js"), projectId], {
    stdio: "inherit"
  });
  if (result.status !== 0) {
    fail(`Failed to sync workspace for ${projectId}`);
  }
}

function main() {
  const { projectId, projectName, groupId, owner } = parseArgs(process.argv.slice(2));
  const agentRoot = path.join(ROOT, "agents", "projects", projectId);
  const workspace = path.join(DATA_ROOT, "agents", projectId, "workspace");
  const agentDir = path.join(agentRoot, "agent");

  if (fs.existsSync(agentRoot)) {
    fail(`Project agent already exists: ${projectId}`);
  }

  createProjectFiles(projectId, projectName, agentRoot);
  ensureProjectDocs(projectId);
  ensureRuntimeDirs(projectId);

  updateRegistry({
    projectId,
    projectName,
    groupId,
    owner,
    agentId: projectId,
    status: "active",
    workspace,
    agentDir,
    projectRoot: path.join(ROOT, "projects", projectId),
    createdAt: new Date().toISOString()
  });

  updateOpenClaw({
    id: projectId,
    workspace,
    agentDir
  });

  syncWorkspace(projectId);
  console.log(`Created project agent: ${projectId}`);
}

main();
