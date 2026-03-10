# OpenClaw Home Repo

这个仓库维护当前 OpenClaw 实例的配置层与核心资产层，不承载运行时垃圾数据。

## 当前能力

- 多飞书 App 对应多 Agent
- Agent 独立人格、独立工作区、独立私有用户记忆
- 同一用户在不同 Agent 间共享低敏稳定画像
- 真实密钥脱离仓库管理
- 太白已具备报价单生成与 SKU 库维护工作流骨架

## 当前结论

截至目前，**多 Agent + 多用户的基础架构已经基本成熟**。

已确认跑通：

- 多 Agent 路由
- 多飞书 App 独立接入
- 多用户 pairing 与独立会话
- Agent 私有用户记忆隔离
- 跨 Agent 低敏公共用户画像共享
- 运行态目录外置

仍待继续打磨：

- 3 个 Agent 的能力与人格差异化还不够明显
- `openclaw gateway status/health` 仍可能出现 CLI 探针误报

## 当前 Agent

- `wukong`：万能管家悟空
- `taibai`：外贸专家太白金星
- `guanyin`：观音菩萨
- `guichengxiang`：归程象

## 操作指引

- 新增 Agent：[`docs/add-agent.md`](docs/add-agent.md)
- 新飞书用户接入：[`docs/add-feishu-user.md`](docs/add-feishu-user.md)
- 外贸轻系统最小模型：[`docs/trade-data-model.md`](docs/trade-data-model.md)
- Agent 记忆污染事故记录：[`docs/agent-memory-pollution.md`](docs/agent-memory-pollution.md)
- 副作用测试清场指引：[`docs/side-effect-test-reset.md`](docs/side-effect-test-reset.md)

## 太白工作流

- 总 skill：`core/skills/trade-operations-workflow/`
- 解析请求：`scripts/trade_parse_request.py`
- 生成报价：`scripts/trade_generate_quote_from_bitable.py`
- SKU 提案/写入：`scripts/feishu_trade_bitable_upsert.js`
- 运行时硬规则：`hooks/taibai-workflow/`

当前规则：

- 报价单必须先补齐客户名、SKU、数量
- SKU 修改必须先提案，再等待 `确认写入`
- `cbm`、`packages`、`totalGw`、`总价`、`总体积` 不写回 SKU 表

## 目录职责

- `agents/`：人格、人设、长期记忆、核心说明
- `core/skills/`：共享技能库
- `hooks/`：运行时 Hook
- `openclaw.json`：当前真实配置
- `openclaw.template.json`：脱敏模板
- `scripts/with-openclaw-secrets.sh`：加载本地 secrets 后启动 OpenClaw

## 命令入口

本仓库里，涉及配置校验、gateway、models、agent 调用时，优先使用：

```bash
./scripts/with-openclaw-secrets.sh openclaw <subcommand>
```

示例：

```bash
./scripts/with-openclaw-secrets.sh openclaw config validate --json
./scripts/with-openclaw-secrets.sh openclaw gateway health
./scripts/with-openclaw-secrets.sh openclaw models list
```

原因：

- 它会先注入本地 `secrets.local.json`
- 否则 `openclaw` 直跑时，常出现缺少 `FEISHU_*_APP_SECRET` 的假告警

## Agent Workspace 规则

- workspace 里的入口文件必须是**实体文件**
- 适用文件：`AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`MEMORY.md`、`SOUL.md`、`TOOLS.md`、`USER.md`、`HEARTBEAT.md`
- `skills`、业务仓库入口目录可以保留软链接

原因：

- 当前 OpenClaw 对 workspace 入口软链接的启动注入不稳定
- 软链接时，`systemPromptReport` 可能把文件判成 `missing`
- 结果是 Agent 退回通用助理口径

## 数据分层

- 仓库内：配置、人设、长期记忆、技能、Hook
- 仓库外：默认 `~/Documents/OpenClawData/`，但**可自定义**

统一入口：

- `node scripts/set-data-root.js /你的/绝对路径`

运行时目录：

- `agents/{agentId}/workspace`
- `agents/{agentId}/sessions`
- `agents/{agentId}/users`
- `agents/{agentId}/logs`
- `shared-users`

## 架构摘要

### 多 Agent 架构

- **入口层**：1 个飞书 App 对应 1 个 `accountId`
- **路由层**：`accountId -> agentId`
- **Agent 层**：每个 Agent 拥有独立人格、人设、长期记忆、workspace、sessions、users、logs

当前映射：

- `wukong` -> 万能管家悟空
- `taibai` -> 外贸专家太白金星
- `guanyin` -> 观音菩萨

当前判断：

- 多 App 进多 Agent 的链路已稳定
- 3 个 Agent 已能分别独立收发消息

### 多用户架构

- **用户主键**：`channel:userId`
- **私有层**：每个 Agent 对每个用户维护独立目录
- **公共层**：同一用户在不同 Agent 间共享低敏稳定画像

当前行为：

- 同一用户在不同 Agent 下是“同一个人”
- 不同用户在同一 Agent 下互相隔离
- 不同 Agent 不读取彼此私有会话和工作文件
- 公共层只共享稳定画像，不共享聊天细节

## 用户记忆模型

- **公共层**：按 `channel:userId` 维护共享用户画像
- **私有层**：按 `agentId + userId` 维护 Agent 私有用户资料

公共层当前仅同步：

- `displayName`
- `preferredName`
- `language`
- `timezone`
- `identityTags`
- `longTermPreferences`
- `stableGoals`

不会共享：

- 会话摘要
- 工作文件
- 其他 Agent 私有记忆

### 当前落盘位置

- 私有用户资料：`~/Documents/OpenClawData/agents/{agentId}/users/...`
- 共享用户画像：`~/Documents/OpenClawData/shared-users/...`
- 安全日志：`~/Documents/OpenClawData/agents/{agentId}/logs/security/...`

## 密钥管理

- 本地：`secrets.local.json`
- 模板：`secrets.local.example.json`
- `openclaw.json` 通过环境变量或本地 secrets 引用真实密钥

## 已知情况

- `openclaw gateway status/health` 仍可能报 `1006`
- 实际飞书消息链路已可用，不能只看这个探针判断服务不可用
- `doctor` / `gateway status` 仍可能提示 `channels.feishu.accounts.default` 之类的迁移建议
- 当前多账号对象结构是刻意配置，不应按该提示回退
- workspace 入口文件若使用软链接，可能导致人格文件未注入

判断 gateway 是否真的有问题，优先看：

- 飞书消息是否能收到
- 日志里是否有 `received message` / `dispatch complete`
- `./scripts/with-openclaw-secrets.sh openclaw gateway health`
