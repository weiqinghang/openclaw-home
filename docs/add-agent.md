# 新增 Agent 指引

本文说明如何在当前 `~/.openclaw` 架构中新增一个自己的 Agent，并把它接到飞书。

## 目标结果

完成后应具备：

- 一个新的 Agent 目录
- 一个新的飞书 App
- `openclaw.json` 中新增 `agent + binding + feishu account`
- 外部运行目录已创建
- 新 App 发消息后能进入新 Agent

## 1. 先确定 4 个标识

新增前先确定：

- `agentId`：内部唯一 ID，只用小写英文、数字、`-`、`_`
- `displayName`：Agent 展示名
- `persona`：人格定位
- `feishu app`：对应飞书应用

示例：

- `agentId`: `athena`
- `displayName`: `战略顾问雅典娜`

## 2. 在 `~/.openclaw/agents/` 下创建 Agent 核心目录

新建：

- `~/.openclaw/agents/{agentId}/IDENTITY.md`
- `~/.openclaw/agents/{agentId}/AGENTS.md`
- `~/.openclaw/agents/{agentId}/SOUL.md`
- `~/.openclaw/agents/{agentId}/USER.md`
- `~/.openclaw/agents/{agentId}/HEARTBEAT.md`
- `~/.openclaw/agents/{agentId}/MEMORY.md`
- `~/.openclaw/agents/{agentId}/TOOLS.md`
- `~/.openclaw/agents/{agentId}/agent/`

其中：

- `IDENTITY.md`：人格定义
- `MEMORY.md`：Agent 长期记忆
- `TOOLS.md`：工具边界与偏好
- `agent/`：模型认证与 Agent 运行配置

最少先补好：

- `IDENTITY.md`
- `AGENTS.md`
- `MEMORY.md`

## 3. 在外部数据目录创建运行时目录

当前运行态不放 `~/.openclaw`，统一放到：

- `{dataRoot}/agents/{agentId}/`

其中 `{dataRoot}` 默认是：

- `~/Documents/OpenClawData`

如果你已经自定义过数据根目录，以当前 `openclaw.json` 中各运行时路径为准；推荐统一使用脚本修改，不要手工逐项改。

至少创建：

- `workspace/`
- `sessions/`
- `users/`
- `logs/security/`

## 4. 给 workspace 补核心文件链接

当前架构下，workspace 里需要能看到 Agent 核心文件。

至少补这些软链接：

- `AGENTS.md`
- `IDENTITY.md`
- `SOUL.md`
- `USER.md`
- `HEARTBEAT.md`
- `MEMORY.md`
- `TOOLS.md`
- `skills -> ~/.openclaw/core/skills`

如果缺这些文件，Agent 可能能启动，但一收消息就报错。

## 5. 修改 `openclaw.json`

需要改 3 处。

### 5.1 `agents.list`

新增：

```json
{
  "id": "athena",
  "agentDir": "/Users/你的用户名/.openclaw/agents/athena/agent",
  "workspace": "{dataRoot}/agents/athena/workspace"
}
```

### 5.2 `bindings`

新增：

```json
{
  "agentId": "athena",
  "match": {
    "channel": "feishu",
    "accountId": "athena"
  }
}
```

### 5.3 `channels.feishu.accounts`

新增：

```json
"athena": {
  "appId": "你的飞书 app id",
  "appSecret": "${FEISHU_ATHENA_APP_SECRET}"
}
```

## 6. 更新 secrets

把新 App 的 secret 写到本地：

- `~/.openclaw/secrets.local.json`

并同步 LaunchAgent 环境变量：

- `FEISHU_ATHENA_APP_SECRET`

如果只改了 `openclaw.json`，没补 secret，gateway 会启动失败或该 app 无法连上。

## 7. 去飞书后台创建并配置 App

在飞书开发者后台：

1. 创建应用
2. 开启机器人能力
3. 开启事件与回调
4. 使用**长连接**接收事件
5. 添加消息接收事件
6. 发布应用版本

至少要有：

- 机器人已启用
- 事件订阅已开启
- 消息接收事件已添加
- 当前版本已发布

如果只加了“用户进入与机器人的会话”，Agent 不会正常回复消息。

## 8. 重启 gateway

执行：

```bash
./scripts/with-openclaw-secrets.sh openclaw gateway restart --force
```

## 9. 首次测试

用新飞书 App 给机器人发消息。

你应看到：

- App 能收到消息
- 如果未授权，会出现 pairing code
- owner 批准 pairing 后，再发消息可正常回复

批准 pairing：

```bash
openclaw pairing approve feishu <PAIRING_CODE>
```

## 10. 排错重点

### 有消息但进错 Agent

检查：

- `bindings.match.accountId`
- `channels.feishu.accounts` 是否为**对象**而不是数组

### App 在线但完全不回

检查：

- 飞书事件是否已发布
- 是否订阅了消息接收事件
- App secret 是否已写入本地 secrets 和 LaunchAgent

### 收到消息后报缺文件

检查：

- 外部 `workspace/` 是否补了核心文件软链接

## 11. 建议流程

推荐固定顺序：

1. 先建 Agent 核心目录
2. 再建外部运行目录
3. 再改 `openclaw.json`
4. 再补 secrets
5. 再去飞书后台配 App
6. 最后重启和 pairing 测试

## 12. 如果你想改数据根目录

执行：

```bash
node scripts/set-data-root.js /你的/绝对路径
```

然后：

1. 在新目录下创建对应 `agents/{agentId}/...`
2. 重新补 workspace 软链接
3. 如有旧数据，执行：

```bash
node scripts/migrate-runtime-data.js
```

4. 重启 gateway
