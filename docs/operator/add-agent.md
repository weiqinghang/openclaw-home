# 新增 Agent 指引

目标：在当前仓库中新增一个 **符合既有规范** 的 Agent，并接入飞书。

## 原则

- `~/.openclaw` 只放配置与核心资产
- 运行态一律放外部数据根目录
- 1 个飞书 App 对应 1 个 `accountId`
- 1 个 `accountId` 只绑定 1 个 `agentId`
- `agentId` 稳定，不用中文，不随人设改名
- 新 Agent 不搞路径特例

## 目录模型

仓库内核心资产：

- `~/.openclaw/agents/{agentId}/IDENTITY.md`
- `~/.openclaw/agents/{agentId}/AGENTS.md`
- `~/.openclaw/agents/{agentId}/SOUL.md`
- `~/.openclaw/agents/{agentId}/USER.md`
- `~/.openclaw/agents/{agentId}/HEARTBEAT.md`
- `~/.openclaw/agents/{agentId}/MEMORY.md`
- `~/.openclaw/agents/{agentId}/TOOLS.md`
- `~/.openclaw/agents/{agentId}/agent/`

仓库外运行态：

- `{dataRoot}/agents/{agentId}/workspace`
- `{dataRoot}/agents/{agentId}/sessions`
- `{dataRoot}/agents/{agentId}/users`
- `{dataRoot}/agents/{agentId}/logs/security`

默认 `dataRoot`：

- `~/Documents/OpenClawData`

## 必备标识

- `agentId`：内部 ID，如 `athena`
- `displayName`：展示名，如 `战略顾问雅典娜`
- `accountId`：建议与 `agentId` 相同
- `FEISHU_{AGENT}_APP_SECRET`：环境变量名

建议：

- `agentId = accountId`
- 环境变量名用大写下划线

## 新增步骤

### 1. 建核心资产目录

至少准备：

- `IDENTITY.md`
- `AGENTS.md`
- `MEMORY.md`
- `TOOLS.md`
- `agent/auth-profiles.json`
- `agent/models.json`

其他文件建议一并补齐：

- `SOUL.md`
- `USER.md`
- `HEARTBEAT.md`

### 2. 建运行时目录

至少创建：

- `workspace`
- `sessions`
- `users`
- `logs/security`

### 3. 给 workspace 补入口文件

必须复制成**实体文件**：

- `AGENTS.md`
- `BOOTSTRAP.md`（如果该 Agent 有）
- `IDENTITY.md`
- `SOUL.md`
- `USER.md`
- `HEARTBEAT.md`
- `MEMORY.md`
- `TOOLS.md`

可以保留软链接：

- `skills -> ~/.openclaw/core/skills`
- 业务仓库入口目录

不要把入口文件做成软链接。  
当前 OpenClaw 对这类入口文件的启动注入不稳定，可能把它们判成 `missing`。

常见结果：

- Agent 能启动
- 首轮人格没注入
- 回答退回通用助理口径

### 4. 修改 `openclaw.json`

必须同时改 3 处。

`agents.list`：

```json
{
  "id": "athena",
  "agentDir": "/Users/你的用户名/.openclaw/agents/athena/agent",
  "workspace": "/Users/你的用户名/Documents/OpenClawData/agents/athena/workspace"
}
```

`bindings`：

```json
{
  "agentId": "athena",
  "match": {
    "channel": "feishu",
    "accountId": "athena"
  }
}
```

`channels.feishu.accounts`：

```json
"athena": {
  "appId": "你的飞书 app id",
  "appSecret": "${FEISHU_ATHENA_APP_SECRET}"
}
```

### 5. 更新本地 secrets

写入：

- `~/.openclaw/secrets.local.json`

新增：

```json
{
  "channels": {
    "feishu": {
      "accounts": {
        "athena": {
          "appSecret": "真实 secret"
        }
      }
    }
  }
}
```

### 6. 同步 LaunchAgent

这是最容易漏的。

仅改 `secrets.local.json` 不够。  
Gateway 作为 LaunchAgent 启动时，只认 **plist 里的环境变量**。

必须把新变量注入：

- `FEISHU_ATHENA_APP_SECRET`

并重启 gateway。

否则会出现：

- `openclaw.json` 看起来没问题
- `secrets.local.json` 里也有 secret
- 但新 App 死活不在线

### 7. 配飞书后台

至少完成：

1. 创建应用
2. 开启机器人
3. 开启事件与回调
4. 使用长连接
5. 添加消息接收事件
6. 发布版本

不要只订阅：

- `用户进入与机器人的会话`

这只能触发进会话事件，不能处理正常消息。

### 8. 校验与重启

本仓库里不要直接裸跑 `openclaw ...`。  
优先使用：

```bash
./scripts/with-openclaw-secrets.sh openclaw <subcommand>
```

否则容易因为没注入本地 secrets，看到假的缺 secret 告警。

执行：

```bash
./scripts/with-openclaw-secrets.sh openclaw config validate --json
./scripts/with-openclaw-secrets.sh openclaw gateway restart --force
```

### 9. 首次测试

给新 App 发消息。

若出现 pairing code，执行：

```bash
openclaw pairing approve feishu <PAIRING_CODE>
```

然后再发一条消息验证：

- 是否进入正确 Agent
- 是否正常回复

## 最容易忽略的点

### 1. LaunchAgent 没同步

最常见。  
现象：

- 配置对
- secret 文件对
- gateway 也在跑
- 但新 App 不在线

根因：

- LaunchAgent 环境里没有新加的 `FEISHU_*_APP_SECRET`

### 2. workspace 用了特例路径

不要把某个 Agent 指到单独业务目录。  
标准做法是：

- 运行态先放 `{dataRoot}/agents/{agentId}/workspace`
- 业务文件再在 workspace 内组织

### 3. workspace 入口文件用了软链接

高风险。  
现象：

- `BOOTSTRAP.md` 明明存在
- Agent 还是自称通用助理

根因：

- workspace 内入口文件是软链接
- 启动注入没稳定跟随软链接

正确做法：

- 入口文件复制为实体文件
- 只保留 `skills`、业务仓库目录为软链接

### 4. `channels.feishu.accounts` 写成数组

必须是对象。  
否则 `accountId -> agentId` 路由可能失效。

### 5. 只建了 Agent 目录，没建运行态目录

这会导致：

- sessions
- users
- logs

落盘不完整，甚至报错。

### 6. 只加了进入会话事件

这不会让 Agent 正常回复消息。  
必须订阅消息接收事件。

### 7. `doctor` / `gateway status` 误报

当前多账号飞书配置是对象结构。  
有时 `doctor` 或 `gateway status` 会提示：

- `channels.feishu.accounts.default`
- 单账号迁移建议
- `RPC probe 1006`

这些不一定代表真实故障。

真正判断标准：

- 新 App 是否能收到消息
- 日志是否出现 `received message` / `dispatch complete`
- `./scripts/with-openclaw-secrets.sh openclaw gateway health` 是否正常

## 推荐顺序

1. 先定 `agentId/accountId/displayName`
2. 建 `agents/{agentId}` 核心资产
3. 建外部运行态目录
4. 复制 workspace 入口文件，并只保留允许的软链接
5. 改 `openclaw.json`
6. 改 `secrets.local.json`
7. 同步 LaunchAgent
8. 配飞书后台
9. 重启 gateway
10. pairing 与消息实测

## 12. 如果你想改数据根目录

执行：

```bash
node scripts/set-data-root.js /你的/绝对路径
```

然后：

1. 在新目录下创建对应 `agents/{agentId}/...`
2. 重新复制 workspace 入口文件
3. 如有旧数据，执行：

```bash
node scripts/migrate-runtime-data.js
```

4. 重启 gateway
