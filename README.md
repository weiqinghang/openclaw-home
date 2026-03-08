# OpenClaw Home Repo

这个仓库维护当前 OpenClaw 实例的配置层与核心资产层，不承载运行时垃圾数据。

## 当前能力

- 多飞书 App 对应多 Agent
- Agent 独立人格、独立工作区、独立私有用户记忆
- 同一用户在不同 Agent 间共享低敏稳定画像
- 真实密钥脱离仓库管理

## 当前 Agent

- `wukong`：万能管家悟空
- `taibai`：外贸专家太白金星
- `guanyin`：观音菩萨

## 目录职责

- `agents/`：人格、人设、长期记忆、核心说明
- `core/skills/`：共享技能库
- `hooks/`：运行时 Hook
- `openclaw.json`：当前真实配置
- `openclaw.template.json`：脱敏模板
- `scripts/with-openclaw-secrets.sh`：加载本地 secrets 后启动 OpenClaw

## 数据分层

- 仓库内：配置、人设、长期记忆、技能、Hook
- 仓库外：`~/Documents/OpenClawData/`

运行时目录：

- `agents/{agentId}/workspace`
- `agents/{agentId}/sessions`
- `agents/{agentId}/users`
- `agents/{agentId}/logs`
- `shared-users`

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

## 密钥管理

- 本地：`secrets.local.json`
- 模板：`secrets.local.example.json`
- `openclaw.json` 通过环境变量或本地 secrets 引用真实密钥

## 已知情况

- `openclaw gateway status/health` 仍可能报 `1006`
- 实际飞书消息链路已可用，不能只看这个探针判断服务不可用
