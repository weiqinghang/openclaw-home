# Laojun UI Design Routing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让老君具备 UI 设计需求收敛与路由能力，并通过 Codex 默认交付可交互原型、截图与设计说明。

**Architecture:** 老君只负责群里收敛 UI 需求、明确交付物与待拍板项，再把任务包路由给 Codex。项目目录新增设计与原型落点，老君自身补充 UI/Figma/Playwright 相关技能认知，但不长期持有设计执行工件。

**Tech Stack:** OpenClaw agent prompts, workspace skill white lists, Node.js test scripts, project bootstrap scaffolding

---

## Chunk 1: Laojun Prompt And Skill Surface

### Task 1: Lock UI routing behavior in laojun prompts

**Files:**
- Modify: `agents/laojun/AGENTS.md`
- Modify: `agents/laojun/BOOTSTRAP.md`
- Modify: `agents/laojun/TOOLS.md`

- [ ] Add UI/UX and interaction design to laojun's accepted task types.
- [ ] State that laojun collects goals, flows, style and acceptance criteria, then routes to Codex by default.
- [ ] Fix delivery contract: interactive prototype, screenshots, design notes, pending decisions.
- [ ] Mention project asset locations under `~/Documents/OpenClawData/projects/<projectId>/`.

### Task 2: Expose the minimum UI skills to laojun workspace

**Files:**
- Modify: `scripts/sync-agent-workspace.js`
- Test: `scripts/sync-agent-workspace.test.js`

- [ ] Write failing assertions for laojun white list to include `ui-ux-pro-max`, `playwright`, `figma`, `figma-implement-design`.
- [ ] Run test and confirm it fails on current white list.
- [ ] Update laojun white list with the new skills.
- [ ] Re-run test and confirm it passes.

## Chunk 2: Project Delivery Layout

### Task 3: Reserve design and prototype directories for project bootstrap

**Files:**
- Modify: `scripts/create-project-agent.js`
- Modify: `scripts/create-project-agent.test.js`
- Modify: `docs/operator/project-agent-bootstrap.md`

- [ ] Write failing test for bootstrapped projects to include `design/`, `prototype/`, and `docs/design/`.
- [ ] Run test and confirm it fails.
- [ ] Implement directory and seed-file creation with minimal placeholders.
- [ ] Re-run test and confirm it passes.

### Task 4: Document the laojun -> Codex UI delivery chain

**Files:**
- Create: `docs/operator/laojun-ui-delivery.md`
- Modify: `docs/agents/laojun/usage.md`

- [ ] Document intake fields, routing rules, default deliverables, and Figma-triggered path.
- [ ] Link the new runbook from laojun usage.

## Chunk 3: Verification And Sync

### Task 5: Sync laojun workspace and verify

**Files:**
- Runtime sync only

- [ ] Run `node scripts/sync-agent-workspace.js laojun`.
- [ ] Verify `~/Documents/OpenClawData/agents/laojun/workspace/skills` contains the new UI skills.
- [ ] Summarize the new user-facing behavior for live testing.
