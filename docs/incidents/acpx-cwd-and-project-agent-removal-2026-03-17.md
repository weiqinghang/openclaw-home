# acpx --cwd 硬编码与项目 Agent 层移除 — 2026-03-17

## 事件概要

老君调度 fullstack-engineer 执行 star-steps 项目的 M0 工程骨架搭建，结果工程文件被创建在 `~/.openclaw/projects/star-steps/` 而不是 `~/Documents/OpenClawData/projects/star-steps/`。后续 fullstack-engineer 完全无法通过 acpx 调用（6 次失败），老君越权降级为 generic Claude Code 完成任务。

## 根因

两个问题的统一根因：**acpx 从 `--cwd` 目录向上搜索 `.acpxrc.json` 来定位 agent 定义。**

### 问题 1：工作目录错误

`acpx-fullstack.sh`（及其他三个 acpx 脚本）硬编码了 `--cwd "$ROOT_DIR"`，其中 `ROOT_DIR` 始终解析为 `~/.openclaw`。这意味着所有四剑客的工作目录永远是 `~/.openclaw`，无论老君从哪个项目调用。

### 问题 2：改 cwd 后 acpx 无法 spawn agent

将 `--cwd` 改为项目目录后，acpx 从项目目录向上搜索 `.acpxrc.json`，找不到（因为 `.acpxrc.json` 只存在于 `~/.openclaw/`），报 `Failed to spawn agent command`。

## 修复

### 1. acpx 脚本支持 `--cwd` 参数传入

四个脚本（`acpx-fullstack.sh`、`acpx-architect.sh`、`acpx-uiux.sh`、`acpx-reviewer.sh`）改为：

```bash
CWD="$ROOT_DIR"
if [[ "${1:-}" == "--cwd" ]]; then
  CWD="${2:?missing --cwd value}"
  shift 2
fi
exec "$ACPX_BIN" --cwd "$CWD" <agent-name> "$@"
```

不传 `--cwd` 时 fallback 到 `~/.openclaw`（向后兼容）。

### 2. 项目目录放 `.acpxrc.json` symlink

在项目根放 symlink：`.acpxrc.json -> ~/.openclaw/.acpxrc.json`。这样 acpx 从项目目录向上搜索时能找到 agent 定义。

`create-project-agent.js` 已自动执行此步骤。已有项目需手动补 symlink。

### 3. 老君 TOOLS.md 强调必须传 `--cwd`

```
acpx-fullstack.sh --cwd ~/Documents/OpenClawData/projects/<projectId> "<task>"
```

## 同期架构变更：移除项目 Agent 中间层

在排查过程中，发现项目 Agent 层的架构问题：

1. 项目 Agent 不干活，只做传话筒和督办
2. 项目状态依赖 session 上下文，跨会话不可靠
3. 每多一层 hop，增加一层超时、丢失、不同步风险

已将老君改为直接持有项目上下文：
- 直接读写项目 docs（delivery-state、decisions、risks、roadmap）
- 直接调度四剑客
- 项目状态以文件为准，不以 session 记忆为准

## 关键经验

### 1. acpx 的 `.acpxrc.json` 查找机制

acpx 从 `--cwd` 指定的目录开始，**逐级向上**搜索 `.acpxrc.json`。找不到就报 `Failed to spawn agent command`。这不是 agent 配置问题，而是配置文件查找路径问题。

**规则：任何需要 acpx 工作的目录，其自身或祖先目录必须有 `.acpxrc.json`。**

### 2. acpx 脚本的 `--cwd` 决定了专家的实际工作目录

`--cwd` 不仅影响 `.acpxrc.json` 查找，还决定了 `claude-acp.mjs` spawn Claude Code 时的 `cwd`。专家在哪个目录下工作、文件创建在哪里，全由这个参数决定。

### 3. 中间 Agent 层的价值需要持续审视

项目 Agent 最初设计是为了 context 隔离，但当状态管理改为文件化后，这层隔离的价值归零，反而增加了通信成本和故障点。架构层应随需求演进而精简。

### 4. LLM Agent 遇到链路失败时会越权降级

老君在 fullstack-engineer 6 次失败后，自行切换到 generic Claude Code 执行。人格文件中虽有"禁止降级"规则，但在压力下 LLM 仍会绕过。**关键规则需要技术保险丝，不能只靠 prompt。**

## 验证清单

- [x] `acpx-fullstack.sh --cwd <projectDir>` 可以创建 session
- [x] 项目目录有 `.acpxrc.json` symlink 后 acpx 可正常 spawn
- [x] 不传 `--cwd` 时 fallback 到 `~/.openclaw`（向后兼容）
- [x] `create-project-agent.js` 自动创建 `.acpxrc.json` symlink
- [x] 老君 TOOLS.md 已更新 `--cwd` 使用说明
- [x] Gateway 已重启，新人格文件已生效
