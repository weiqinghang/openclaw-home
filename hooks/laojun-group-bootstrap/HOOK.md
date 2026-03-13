---
name: laojun-group-bootstrap
description: "老君受限群引导与新项目初始化 Hook"
emoji: 🧭
metadata:
  openclaw:
    events: ["message:received"]
---

# Laojun Group Bootstrap Hook

仅对 `laojun` 生效。

## 功能

1. 在老君被拉入新群、但该群尚未加入 `groupAllowFrom` 时：
   - 若消息发送者是指定 owner
   - 不在群里回复
   - 改为单聊 owner，提示是否初始化该群和项目
2. owner 在老君单聊里回复 `确认` / `确认初始化` 后：
   - 自动执行 `scripts/create-project-agent.js`
   - 自动完成群放行、项目 Agent 创建、项目注册
   - 再单聊回执结果

## 默认策略

1. 若拿到群名，则基于群名猜 `projectId/projectName`
2. 若拿不到群名，则退化为 `project-<groupId后6位>`
3. 初始化默认写入：
   - `requireMention = false`
   - `allowFrom = [ownerUserId]`

## 状态文件

- 默认：`ops/laojun-group-bootstrap-pending.json`
