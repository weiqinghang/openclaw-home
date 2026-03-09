# 新飞书用户接入指引

本文说明：一个企业里的新飞书用户，如何开始使用部分或全部 Agent。

## 适用场景

适用于：

- 新员工要接入已有 Agent
- 某个员工只允许使用部分 Agent
- 某个员工需要使用全部 Agent

## 当前接入机制

当前架构分两层：

- **Agent 入口层**：由不同飞书 App 决定进入哪个 Agent
- **用户权限层**：由 pairing + `user-permissions` 决定该用户能否使用

结论：

- 用户要使用哪个 Agent，就去加哪个飞书 App
- 每个 App 首次使用时都可能需要单独 pairing

## 1. 用户侧怎么做

新飞书用户只需：

1. 在飞书里找到对应 Agent 的机器人
2. 给机器人发一条消息
3. 如果弹出 pairing code，把 code 发给管理员
4. 等管理员批准后，再发消息

## 2. 管理员侧怎么做

管理员收到 pairing code 后执行：

```bash
./scripts/with-openclaw-secrets.sh openclaw pairing approve feishu <PAIRING_CODE>
```

批准后，该用户就能使用对应 App 所绑定的 Agent。

## 3. 如何让用户只使用部分 Agent

做法很简单：

- 只把对应 Agent 的飞书 App 发给该用户
- 只批准该用户在这些 App 下的 pairing

这样用户自然只能进入这些 Agent。

## 4. 如何让用户使用全部 Agent

管理员需要：

1. 把所有 Agent 对应的飞书 App 都提供给该用户
2. 让用户分别给每个 App 发一条消息
3. 分别批准每个 App 返回的 pairing code

注意：

- `wukong`、`taibai`、`guanyin` 是 3 个独立 App
- pairing 不是全局一次生效，而是按 App / Agent 入口生效

## 5. 用户接入后会发生什么

接入成功后：

- 每个 Agent 都会给该用户建立独立私有目录
- 同一用户在不同 Agent 间会共享低敏公共画像
- 不同用户彼此隔离

当前落盘：

- 私有目录：`{dataRoot}/agents/{agentId}/users/...`
- 公共画像：`{dataRoot}/shared-users/...`

其中 `{dataRoot}` 默认是 `~/Documents/OpenClawData`，也可以由管理员自定义。

## 6. 如果用户说“机器人不认识我”

先看是不是这几类情况：

### 返回 pairing code

说明：

- 机器人收到了消息
- 但管理员还没批准 pairing

处理：

- 管理员执行 `./scripts/with-openclaw-secrets.sh openclaw pairing approve feishu <PAIRING_CODE>`

### 完全没反应

说明：

- 可能是飞书 App 后台事件没配好
- 也可能该用户还没被允许使用该 App

处理：

- 先确认 App 已发布
- 再确认消息接收事件已开启
- 再看 `gateway.log` 是否有 `received message`

### 进错 Agent

说明：

- 是 App 到 Agent 的绑定错了

处理：

- 检查 `openclaw.json` 中的 `bindings`

## 7. 如果用户离职或不再允许使用

当前最简单的做法：

1. 不再给他对应 App
2. 从权限规则中移除特殊信任或管理员身份
3. 必要时停用其 pairing / 访问策略

如果要做精细回收，可在后续补专门的用户禁用规则。
