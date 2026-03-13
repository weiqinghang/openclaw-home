# Engineering Methodology Adoption Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` if subagents are available, otherwise use `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 OpenClaw 内统一采用 `Spec-kit + OpenSpec + Superpowers + 极限编程` 作为默认工作流与核心工程方法论。

**Architecture:** 用 `Spec-kit` 管新能力定义，用 `OpenSpec` 管存量系统变更，用 `Superpowers` 提供计划、TDD、review、验证等执行技能，用 `XP` 约束日常交付节奏。入口按任务类型路由，产物沉淀到 spec、plan、tests、review 四类工件。

**Tech Stack:** OpenClaw docs, local Codex skills, Superpowers skills, ACP-routed agents, git

---

## Chunk 1: Skill Baseline

### Task 1: 安装并注册方法论技能

**Files:**
- Create: `core/skills/spec-kit-workflow/SKILL.md`
- Create: `core/skills/spec-kit-workflow/references/spec-checklist.md`
- Create: `core/skills/openspec-workflow/SKILL.md`
- Create: `core/skills/openspec-workflow/references/change-checklist.md`
- Create: `core/skills/extreme-programming/SKILL.md`
- Create: `core/skills/extreme-programming/references/xp-checklist.md`

- [x] **Step 1: 定义三个本地 skill 的触发条件与输出约束**
- [x] **Step 2: 让 skill 结构符合仓库标准**
- [x] **Step 3: 安装官方 CLI**
Run:
  - `uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git`
  - `npm install -g @fission-ai/openspec@latest`
Expected: `specify` 与 `openspec` 可用

- [ ] **Step 4: 将 skill 注册到 `~/.agents/skills`**
Run: `ln -sfn /Users/claw/.openclaw/core/skills/spec-kit-workflow /Users/claw/.agents/skills/spec-kit-workflow` 等同类命令  
Expected: `~/.agents/skills` 下出现三个新链接

- [ ] **Step 5: 验证 Codex 可见**
Run: `ls -la /Users/claw/.agents/skills`  
Expected: 可见 `spec-kit-workflow`、`openspec-workflow`、`extreme-programming`

- [ ] **Step 6: 评估是否初始化当前仓库**
Decision:
  - 先不直接执行 `specify init` / `openspec init`
  - 待 review 后再决定是否把官方脚手架并入现有仓库

### Task 2: 固化 `Superpowers` 的使用位置

**Files:**
- Modify: `docs/superpowers/plans/2026-03-13-engineering-methodology-adoption.md`

- [ ] **Step 1: 明确默认必用 skill**
Rules:
  - 设计前 `brainstorming`
  - 计划前 `writing-plans`
  - 实现前 `test-driven-development`
  - 完成前 `verification-before-completion`
  - 合并前 `requesting-code-review`

- [ ] **Step 2: 记录例外规则**
Rules:
  - 极小文档改动可跳过 TDD
  - 高风险改动不可跳过 verification 和 review

## Chunk 2: Workflow Routing

### Task 3: 建立任务分类规则

**Files:**
- Modify: `docs/superpowers/plans/2026-03-13-engineering-methodology-adoption.md`

- [ ] **Step 1: 定义入口判定**
Rules:
  - 新能力 / 新流程 / 新 Agent -> `Spec-kit`
  - 既有系统变更 / 迁移 / 重构 -> `OpenSpec`
  - 实施阶段统一进入 `XP + Superpowers`

- [ ] **Step 2: 定义角色路由**
Rules:
  - `architect` 负责结构与 trade-off
  - `fullstack-engineer` 负责实现与联调
  - `reviewer` 负责 findings 与回归风险
  - `Codex` 负责仓库级执行与兜底

### Task 4: 统一工件模型

**Files:**
- Modify: `docs/superpowers/plans/2026-03-13-engineering-methodology-adoption.md`

- [ ] **Step 1: 规定四类核心工件**
Artifacts:
  - spec
  - plan
  - tests
  - review findings

- [ ] **Step 2: 规定每类工件的最小字段**
Rules:
  - spec 至少含 goal、scope、acceptance、risks
  - plan 至少含 file map、steps、commands、expected output
  - tests 对应 acceptance
  - review findings 必须指出风险与证据

## Chunk 3: Rollout

### Task 5: 从单项目试点到默认方法论

**Files:**
- Modify: `docs/superpowers/plans/2026-03-13-engineering-methodology-adoption.md`

- [ ] **Step 1: 选择一个项目试点**
Expected: 先在一个 active project 内跑完一轮 spec -> plan -> implementation -> review

- [ ] **Step 2: 复盘并修正文档**
Expected: 将失败点沉淀到对应 skill 或 agent prompt

- [ ] **Step 3: 扩展为默认标准**
Expected: 后续新项目默认采用该工作流，旧项目按变更窗口切换

## Adoption Notes

- `Spec-kit` 处理从 0 到 1 的定义问题。
- `OpenSpec` 处理存量系统的变更控制。
- `Superpowers` 提供可复用执行技能。
- `XP` 保证实现阶段的小步快跑、持续反馈、持续重构。

**Plan complete and saved to `docs/superpowers/plans/2026-03-13-engineering-methodology-adoption.md`.**
