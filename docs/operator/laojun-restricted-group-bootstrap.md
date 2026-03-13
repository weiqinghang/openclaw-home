# 老君受限群引导

目标：当 `laojun` 被拉进一个尚未初始化的新群时，即使群内无法直接回复，也能单聊 owner 引导完成群+项目初始化。

## 触发条件

1. `agentId = laojun`
2. 收到飞书群消息
3. 该群不在 `channels.feishu.groupAllowFrom`
4. 发送者是配置里的 owner

## 行为

1. 不在群里回复
2. 单聊 owner，发送初始化确认消息
3. owner 回复 `确认` 或 `确认初始化`
4. 自动执行 `scripts/create-project-agent.js`
5. 完成：
   - 群放行
   - 群免 `@`
   - 群级 `allowFrom`
   - 项目 Agent 创建
   - 注册表更新

## 配置入口

见 [openclaw.json](/Users/claw/.openclaw/openclaw.json)：

```json
"hooks": {
  "internal": {
    "entries": {
      "laojun-group-bootstrap": {
        "enabled": true,
        "config": {
          "agentId": "laojun",
          "ownerUserId": "ou_xxx"
        }
      }
    }
  }
}
```

## 状态文件

- `ops/laojun-group-bootstrap-pending.json`

用于记录待确认的新群初始化请求。
