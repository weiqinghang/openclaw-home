# 飞书群聊调试与排障

适用场景：

- 单聊正常，群聊不响应
- 群里 `@` 机器人能进日志，但不 `@` 不响应
- 群消息已进 Agent，但用户看不到回复

## 先看 4 层

1. **飞书权限层**
2. **OpenClaw 群策略层**
3. **Agent 会话 / dedup 层**
4. **飞书显示层**

不要一上来就改 prompt。先分层定位。

## 1. 飞书权限层

### 关键结论

- `im:message.group_at_msg:readonly` 只够收 **群里 @ 机器人** 的消息
- 要收 **群里普通消息**，必须补：
  - `im:message.group_msg`

如果缺这个权限，现象通常是：

- 单聊正常
- 群里 `@` 时可能有日志
- 群里不 `@` 时，`gateway.log` 完全没有新的 `received message`

### 还要确认

1. 事件订阅包含 `im.message.receive_v1`
2. 飞书应用已发布最新版本
3. 机器人已在目标群里

## 2. OpenClaw 群策略层

### 允许群接入

**关键经验：Feishu 多账号模式下，优先检查账号级配置。**

也就是：

- `channels.feishu.accounts.laojun.groupPolicy`
- `channels.feishu.accounts.laojun.groupAllowFrom`
- `channels.feishu.accounts.laojun.groups.<groupId>`

不要只看顶层 `channels.feishu.*`。

这次实际根因就是：

1. 顶层 `channels.feishu.groupAllowFrom` 已写入新群
2. 日志也出现了 `config hot reload applied`
3. 但运行时仍报：
   - `group oc_xxx not in groupAllowFrom (groupPolicy=allowlist)`
4. 最终确认：多账号 Feishu 运行时读的是 `channels.feishu.accounts.<accountId>`，不是顶层

### 顶层单账号写法

若使用 allowlist：

```json
{
  "channels": {
    "feishu": {
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["oc_xxx"]
    }
  }
}
```

若群不在 allowlist，日志会出现：

```text
group oc_xxx not in groupAllowFrom (groupPolicy=allowlist)
```

### 允许群里不 @ 直接聊

不要全局放开，优先按群开例外：

```json
{
  "channels": {
    "feishu": {
      "groups": {
        "oc_xxx": {
          "requireMention": false,
          "allowFrom": ["ou_xxx"]
        }
      }
    }
  }
}
```

说明：

- `requireMention: false`：这个群里不必 `@`
- `allowFrom`：只允许指定用户直接触发，避免群噪音

### 多账号 Feishu 正确写法

```json
{
  "channels": {
    "feishu": {
      "accounts": {
        "laojun": {
          "groupPolicy": "allowlist",
          "groupAllowFrom": ["oc_xxx"],
          "groups": {
            "oc_xxx": {
              "requireMention": false,
              "allowFrom": ["ou_xxx"]
            }
          }
        }
      }
    }
  }
}
```

## 3. 会话与 dedup 层

### 什么时候要清 session

如果群消息已经进了网关，但表现还沿用旧规则，先清：

- `~/Documents/OpenClawData/agents/<agentId>/sessions/sessions.json` 中对应群 key
- 对应 transcript jsonl

典型群 key：

```text
agent:<agentId>:feishu:group:<chat_id>
```

### 什么时候要清 dedup

如果发了新消息，但日志没有任何新的 `received message`，可能被去重缓存吞掉。清：

```text
~/.openclaw/feishu/dedup/<agentId>.json
```

清完后重启 gateway。

## 4. 显示层

### 误判一：其实已经回了，只是回成“回复当前消息”

判断方法：

1. 日志里有：
   - `dispatching to agent`
   - `dispatch complete (queuedFinal=true, replies=1)`
2. session transcript 里有完整回复文本
3. 但群主时间线看不到

这通常说明回复被发成：

- `[[reply_to_current]]`
- 或线程 / 回复面板模式

### 处理方式

对该 Agent 加硬规则：

- 群聊默认直接发到主时间线
- 禁止输出 `[[reply_to_current]]`
- 禁止输出 `[[reply_to:...]]`

改完后要：

1. `node scripts/sync-agent-workspace.js <agentId>`
2. 清旧群会话

## 推荐排障顺序

1. 看 `gateway.log` 有没有新的 `received message`
2. 若没有：
   - 先查飞书权限
   - 再查事件订阅 / 发布状态
   - 再查 dedup
3. 若有 `received message` 但没有 `dispatching to agent`：
   - 查 `groupAllowFrom`
   - 查 `requireMention`
4. 若有 `dispatch complete (replies=1)` 但用户看不到：
   - 查 transcript
   - 查是否用了 `[[reply_to_current]]`
   - 查飞书是否显示在回复面板

## 这次验证出的有效经验

1. 单聊正常不代表群聊权限没问题
2. `im:message.group_at_msg:readonly` 不等于“可收群里全部消息”
3. 群策略、mention gating、dedup、显示层是四个独立问题
4. 先看日志有没有 `received message`，能最快切分“飞书没投递”还是“OpenClaw 没处理”
5. 飞书群如果要做“1 群 = 1 项目 = 1 会话”，建议：
   - 对应账号下 `groupPolicy = "allowlist"`
   - 对应账号下 `groupAllowFrom += groupId`
   - 对应账号下 `groups.<groupId>.requireMention = false`
   - 对应账号下 `groups.<groupId>.allowFrom` 只放项目 owner
   - 共享 PM 作为唯一对外入口
