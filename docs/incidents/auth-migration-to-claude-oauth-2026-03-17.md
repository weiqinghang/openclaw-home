# 认证迁移：API Key → Claude OAuth — 2026-03-17

## 事件概要

用户在飞书给悟空发消息时收到 billing error，API Key 余额不足。随后将认证方式迁移为 Claude OAuth token。

## 时间线

1. 用户修改 `openclaw.json` 尝试添加 `minimax-cn` 认证，引入了 `keyRef` 引用不存在的 `localfile` secret provider
2. Gateway 启动失败：`SecretProviderResolutionError: Secret provider "localfile" is not configured`
3. 从 `auth-profiles.json` 删除 `minimax-cn:default` 条目，Gateway 恢复
4. 用户误以为 `openclaw.json` 也被破坏，从 git 恢复（实际问题在 `auth-profiles.json`）
5. 确认所有 Agent 使用 `anthropic:default` API Key（`sk-ant-api03-...`），余额已耗尽
6. 用户决定移除公司代理 `anthropic-proxy`
7. 从 `openclaw.json` 清除所有 `anthropic-proxy` 相关配置，模型引用改为 `anthropic/claude-opus-4-6`
8. 清除后 JSON 出现 trailing comma，修复后 Gateway 正常
9. 用户通过 `openclaw models auth setup-token` 完成 Claude OAuth 登录
10. `anthropic:manual`（OAuth token）写入 `auth-profiles.json`，auth order 自动更新
11. 所有 Agent 恢复正常

## 根因

- API Key 余额耗尽是直接原因
- `minimax-cn` 的 `keyRef` 配置错误是 Gateway 崩溃的原因

## 关键经验

### 1. auth-profiles.json 不在 git 中

被 `.gitignore` 的 `agents/**/agent/` 规则排除。这意味着：
- 认证凭证不会泄露到代码仓库（安全）
- 但也无法通过 `git checkout` 恢复（运维风险）
- 需要独立备份策略

### 2. openclaw.json 与 auth-profiles.json 的关系

- `openclaw.json` 的 `auth.profiles` 声明 profile 的 provider 和 mode
- `auth-profiles.json` 存储实际凭证（key、token、access/refresh）
- `openclaw.json` 的 `auth.order` 决定同一 provider 下 profile 的优先级
- 两者必须一致，否则 Gateway 会找不到凭证或引用不存在的 provider

### 3. 编辑 JSON 后必须验证格式

用 Edit 工具删除 JSON 块时容易留下 trailing comma，导致 JSON 无效。
修改后务必运行：`python3 -c "import json; json.load(open('openclaw.json'))"`

### 4. Claude OAuth 登录命令

```bash
# 正确命令（需 TTY）
openclaw models auth setup-token

# 错误命令（需要 provider plugin）
openclaw models auth login --provider anthropic  # → "No provider plugins found"
```

### 5. Gateway 启动失败的常见原因

- JSON 格式错误（trailing comma、缺少引号）
- 引用不存在的 secret provider
- auth-profiles.json 中 profile 与 openclaw.json 声明不匹配

## 当前认证状态

| Profile | 类型 | 优先级 | 状态 |
|---------|------|--------|------|
| `anthropic:manual` | OAuth token | 1（最高） | 正常，走 Claude 订阅 |
| `anthropic:default` | API Key | 2 | 余额耗尽 |
| `openai-codex:default` | OAuth | — | 正常 |
| `minimax-portal:default` | OAuth | — | 正常 |
