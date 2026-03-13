# 飞书项目群初始化 Runbook

适用场景：

- 新建一个项目群
- 把 `laojun` 拉进群
- 希望群里直接聊，不必每次 `@`

## 最小步骤

1. 在群里发一条消息，确认群消息已到网关  
   典型日志：

```text
received message from ou_xxx in oc_xxx (group)
```

2. 若日志报：

```text
group oc_xxx not in groupAllowFrom (groupPolicy=allowlist)
```

说明群还没初始化。

3. 执行：

```bash
node scripts/create-project-agent.js <projectId> \
  --project-name "<项目名>" \
  --group-id "<群ID>" \
  --owner-user-id "<ownerUserId>"
```

4. 若是 **Feishu 多账号模式**，确认配置已写入：

- `channels.feishu.accounts.<accountId>.groupAllowFrom`
- `channels.feishu.accounts.<accountId>.groups.<groupId>.requireMention = false`
- `channels.feishu.accounts.<accountId>.groups.<groupId>.allowFrom = [ownerUserId]`

5. 等待 hot reload，或重启 gateway

6. 在群里再发一条**全新消息**

## 这次验证出的根因

`openclaw.json` 顶层 `channels.feishu.groupAllowFrom/groups` 在多账号 Feishu 模式下不够。  
运行时实际读的是：

```text
channels.feishu.accounts.<accountId>.*
```

## 成功判据

日志应从：

```text
group oc_xxx not in groupAllowFrom
```

变成：

```text
dispatching to agent (session=agent:laojun:feishu:group:oc_xxx)
dispatch complete (queuedFinal=true, replies=1)
```
