# OpenClaw Runtime Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 固化 LaunchAgent secrets 同步、收口 `doctor` 配置漂移，并补最小回归清单，降低后续 `openclaw update` 的维护成本。

**Architecture:** 新增一个独立的 LaunchAgent 同步脚本，专门处理 `secrets.local.json -> plist/launchctl` 的环境变量同步；将 Feishu 顶层冗余配置迁到更明确的账号级配置，避免多账号场景下的 `doctor` 漂移提示；把已有健康检查脚本组合成最小回归入口，并补 operator 文档。

**Tech Stack:** Node.js (`node:test`, `assert/strict`), shell scripts, JSON config, operator docs

---

## Chunk 1: LaunchAgent Secrets Sync

### Task 1: 为同步脚本补测试

**Files:**
- Create: `scripts/sync-launchagent-secrets.test.js`

- [ ] **Step 1: 写失败测试，覆盖 plist 环境变量同步**
- [ ] **Step 2: 跑测试，确认脚本缺失而失败**

### Task 2: 实现同步脚本

**Files:**
- Create: `scripts/sync-launchagent-secrets.js`
- Modify: `README.md`
- Modify: `docs/operator/add-agent.md`

- [ ] **Step 1: 实现读取 `secrets.local.json` 并生成 `OPENCLAW_GATEWAY_TOKEN` 与 `FEISHU_*_APP_SECRET` 集合**
- [ ] **Step 2: 实现 plist `EnvironmentVariables` 幂等写入**
- [ ] **Step 3: 实现可选 `launchctl setenv` 与可选 gateway 重启**
- [ ] **Step 4: 运行测试，确认通过**

## Chunk 2: Doctor Drift Cleanup

### Task 3: 为配置生成与 dry-run 行为补测试

**Files:**
- Modify: `scripts/init-local-instance.test.js`
- Create: `scripts/create-project-agent.test.js`

- [ ] **Step 1: 写失败测试，确认初始化后不再保留顶层 Feishu 冗余字段**
- [ ] **Step 2: 写失败测试，确认项目 agent dry-run 输出账号级路径**
- [ ] **Step 3: 跑测试，确认失败原因正确**

### Task 4: 收口顶层 Feishu 冗余配置

**Files:**
- Modify: `openclaw.template.json`
- Modify: `openclaw.json`
- Modify: `scripts/init-local-instance.js`
- Modify: `scripts/create-project-agent.js`
- Modify: `scripts/feishu_trade_doc.js`
- Modify: `scripts/feishu_trade_bitable.js`
- Modify: `scripts/feishu_trade_bitable_sync.js`

- [ ] **Step 1: 把账号默认约束收口到 `channels.feishu.accounts.<accountId>`**
- [ ] **Step 2: 删除顶层重复的 `groupAllowFrom/groups/userAllowlist` 等冗余项**
- [ ] **Step 3: 更新引用这些顶层字段的脚本回退逻辑**
- [ ] **Step 4: 运行测试，确认配置生成与 dry-run 行为通过**

## Chunk 3: Minimal Regression Checklist

### Task 5: 固化最小回归入口

**Files:**
- Create: `docs/operator/minimal-regression-checklist.md`
- Modify: `README.md`
- Modify: `docs/index.md`

- [ ] **Step 1: 写最小回归清单，覆盖 gateway、项目级 ACP、内部 ACP、关键人工检查项**
- [ ] **Step 2: 在 README 和 docs index 挂入口**
- [ ] **Step 3: 手动重跑 `./scripts/check-acp-runtime.sh` 与 `gateway health`，确认文档与实际一致**

## Verification

- [ ] `node --test scripts/init-local-instance.test.js`
- [ ] `node --test scripts/check-local-instance.test.js`
- [ ] `node --test scripts/sync-launchagent-secrets.test.js`
- [ ] `node --test scripts/create-project-agent.test.js`
- [ ] `./scripts/with-openclaw-secrets.sh openclaw gateway health`
- [ ] `./scripts/check-acp-runtime.sh`
