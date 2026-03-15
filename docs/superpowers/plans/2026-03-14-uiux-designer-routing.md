# UIUX Designer Routing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `uiux-designer` 专家 Agent，并让老君与项目协调员把设计类任务默认路由给它，而不是自己做或转给 Codex。

**Architecture:** 仓库侧增加 `uiux-designer` 专家提示词骨架，更新老君与项目协调员的硬路由文案，并收紧老君 workspace 技能白名单，移除设计执行技能，降低其直接执行原型任务的概率。测试先锁定白名单与项目 Agent 模板行为，再做最小实现。

**Tech Stack:** Markdown agent prompts, Node.js test runner, existing workspace sync script

---

## Chunk 1: Lock Behavior With Tests

### Task 1: Update workspace sync expectations

**Files:**
- Modify: `scripts/sync-agent-workspace.test.js`
- Test: `scripts/sync-agent-workspace.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/sync-agent-workspace.test.js`
Expected: FAIL because laojun still receives UI delivery skills.

- [ ] **Step 3: Write minimal implementation**

```js
laojun: [
  "find-skills",
  "summarize",
  "spec-kit-workflow",
  "openspec-workflow",
  "extreme-programming"
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/sync-agent-workspace.test.js`
Expected: PASS

### Task 2: Lock project-agent routing text

**Files:**
- Modify: `scripts/create-project-agent.test.js`
- Test: `scripts/create-project-agent.test.js`

- [ ] **Step 1: Write the failing test**

```js
const tools = fs.readFileSync(path.join(projectRoot, "agent", "TOOLS.md"), "utf8");
assert.match(tools, /UI\\/UX Agent：`uiux-designer`/);
assert.match(tools, /UI\\/UX、页面设计、原型制作、Figma 实现 -> `uiux-designer`/);
assert.doesNotMatch(tools, /底层工程兜底：Codex/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/create-project-agent.test.js`
Expected: FAIL because generated project agent still routes design work to Codex.

- [ ] **Step 3: Write minimal implementation**

```md
1. 架构设计、技术选型、边界划分 -> `architect`
2. UI/UX、页面设计、原型制作、Figma 实现 -> `uiux-designer`
3. 实现、联调、脚本排查、配置修改 -> `fullstack-engineer`
4. 代码审查、回归风险、测试缺口 -> `reviewer`
5. Claude ACP 链路不可用，或需要更稳的底层工程执行时 -> `Codex`
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/create-project-agent.test.js`
Expected: PASS

## Chunk 2: Implement Prompts And Docs

### Task 3: Add `uiux-designer` expert profile

**Files:**
- Create: `agents/uiux-designer/AGENTS.md`
- Create: `agents/uiux-designer/BOOTSTRAP.md`
- Create: `agents/uiux-designer/IDENTITY.md`
- Create: `agents/uiux-designer/SOUL.md`
- Create: `agents/uiux-designer/TOOLS.md`
- Create: `agents/uiux-designer/USER.md`
- Create: `agents/uiux-designer/MEMORY.md`
- Create: `agents/uiux-designer/HEARTBEAT.md`

- [ ] **Step 1: Add minimal expert-agent prompts**
Expected: 明确该 Agent 只做产品设计、原型、UI，不做前端实现与长期项目工件维护。

- [ ] **Step 2: Keep routing boundaries explicit**
Expected: 老君负责收敛与分派，项目协调员负责项目工件，`fullstack-engineer` 负责实现。

### Task 4: Update laojun and operator docs

**Files:**
- Modify: `agents/laojun/AGENTS.md`
- Modify: `agents/laojun/BOOTSTRAP.md`
- Modify: `agents/laojun/TOOLS.md`
- Modify: `agents/laojun/MEMORY.md`
- Modify: `docs/agents/laojun/usage.md`
- Modify: `docs/operator/laojun-ui-delivery.md`

- [ ] **Step 1: Replace default UI routing target**
Expected: 设计类任务默认转 `uiux-designer`，不再写为 `Codex`。

- [ ] **Step 2: Explain the new split**
Expected: `uiux-designer` 负责设计产出，`Codex` 仅保留底层仓库执行兜底。

## Chunk 3: Verify

### Task 5: Run focused regression tests

**Files:**
- Test: `scripts/sync-agent-workspace.test.js`
- Test: `scripts/create-project-agent.test.js`

- [ ] **Step 1: Run targeted tests**

Run: `node --test scripts/sync-agent-workspace.test.js scripts/create-project-agent.test.js`
Expected: PASS

- [ ] **Step 2: Review docs for consistency**
Expected: 仓库内不再把老君设计默认路由写成 Codex。
