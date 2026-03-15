# Expert Routing And Modular Delivery Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 禁止老君把共享专家任务降级成通用 subagent，并把“模块化、分文件、禁止巨大单文件”提升为共享执行规则。

**Architecture:** 通过三层约束收口：OpenClaw 配置层硬禁 `sessions_spawn`，老君/项目模板层改为 direct acpx 专家路由，Claude 专家 prompt 层强制模块化交付与分步写入。

**Tech Stack:** OpenClaw gateway config, agent workspace prompts, Claude expert prompts, Node template script

---

## Chunk 1: Routing Hardening

### Task 1: Lock laojun away from generic subagents

**Files:**
- Modify: `/Users/claw/.openclaw/openclaw.json`
- Modify: `/Users/claw/.openclaw/agents/laojun/AGENTS.md`
- Modify: `/Users/claw/.openclaw/agents/laojun/BOOTSTRAP.md`
- Modify: `/Users/claw/.openclaw/agents/laojun/TOOLS.md`

- [ ] Add per-agent tool deny for `sessions_spawn`
- [ ] Point all shared experts to direct acpx entry scripts
- [ ] Ban generic `claude`,通用 `subagent` 和“直接写文件”替代路径
- [ ] Sync laojun runtime workspace

## Chunk 2: Shared Delivery Rules

### Task 2: Encode modular delivery into templates and expert prompts

**Files:**
- Modify: `/Users/claw/.openclaw/scripts/create-project-agent.js`
- Modify: `/Users/claw/.claude/agents/uiux-designer.md`
- Modify: `/Users/claw/.claude/agents/architect.md`
- Modify: `/Users/claw/.claude/agents/fullstack-engineer.md`
- Modify: `/Users/claw/.claude/agents/reviewer.md`

- [ ] Add “split modules first” rule to project-agent templates
- [ ] Forbid one-shot giant files in `uiux-designer`
- [ ] Require modularity and maintainability bias in architect/fullstack/reviewer

## Chunk 3: Verification

### Task 3: Verify runtime and config behavior

**Files:**
- Check: `/Users/claw/Documents/OpenClawData/agents/laojun/workspace/AGENTS.md`
- Check: `/Users/claw/.openclaw/openclaw.json`

- [ ] Restart gateway
- [ ] Verify laojun runtime workspace includes new rules
- [ ] Verify config contains `sessions_spawn` deny for laojun
- [ ] Summarize residual risk: need a real Feishu round-trip to prove hardening end-to-end
