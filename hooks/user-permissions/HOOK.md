---
name: user-permissions
description: "多用户权限隔离 + 安全过滤 Hook"
emoji: 🛡️
metadata:
  openclaw:
    events: ["message:received"]
    requires:
      config: ["workspace.dir"]
---

# User Permissions Hook

多用户权限隔离与安全过滤 Hook。

## 功能

1. **用户识别**：从消息上下文识别用户身份（飞书/Telegram/其他渠道）
2. **规则匹配**：支持按 `userIds`、`channels`、`channelUsers`、`userIdPrefixes`、`metadata` 匹配用户
3. **角色模板**：用 `roleTemplates` 定义 admin/trusted/user/guest 等权限模板
4. **权限检查**：对不同角色执行工具/路径限制
5. **安全过滤**：支持全局、角色级、用户级三层敏感词拦截

## 事件

- `message:received`：消息接收时触发

## 配置

在 `openclaw.json` 中配置用户权限：

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "user-permissions": {
          "enabled": true,
          "config": {
            "defaultRole": "guest",
            "userDataDir": "~/.openclaw/users",
            "roleTemplates": {
              "admin": {
                "allowedTools": ["*"],
                "allowedDir": "~"
              },
              "trusted": {
                "allowedTools": ["read", "write", "browser"]
              },
              "guest": {
                "allowedTools": ["message"],
                "blockedPatterns": ["升级权限"]
              }
            },
            "userRules": [
              {
                "name": "owner",
                "role": "admin",
                "match": {
                  "userIds": ["feishu_ou_xxx"]
                }
              },
              {
                "name": "ops",
                "role": "trusted",
                "match": {
                  "channels": ["webchat"],
                  "userIdPrefixes": ["ops_"]
                }
              }
            ]
          }
        }
      }
    }
  }
}
```

## 兼容性

- 旧配置里的 `adminIds` 仍然有效，会自动映射成 admin 规则。
- 未命中任何规则的用户会回退到 `defaultRole`，默认是 `user`。
